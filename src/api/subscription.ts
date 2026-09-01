import {
  QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, ApiError } from '../utils/api';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '../store/authStore';

// Server-side conflicts that all mean the same thing to the client: our cached
// view of the account is behind the server's. The attempt is genuinely refused,
// but the fix is a refetch, not a retry — after it the screen shows the real
// state (already subscribed, trial no longer offered) instead of leaving the
// paywall selling a plan the user already owns.
const STALE_STATE_ERROR_CODES = [
  'SUBSCRIPTION_ALREADY_ACTIVE',
  'TRIAL_ALREADY_ACTIVATED',
  'TRIAL_ACTIVATION_IN_PROGRESS',
  'TRIAL_NOT_ELIGIBLE',
];

/** True when the caller should refresh subscription state rather than offer a retry. */
export const isStaleSubscriptionStateError = (error: unknown): boolean => {
  const code = (error as ApiError | undefined)?.code;
  return typeof code === 'string' && STALE_STATE_ERROR_CODES.includes(code);
};

// Every cache whose contents depend on subscription state: the subscription
// itself, the denormalized user record, the content lists and detail that carry
// per-user lock flags, and the offered plans (the trial disappears once it is
// consumed). Anything that moves that state refreshes the whole set, so no
// screen is left rendering a mix.
const ENTITLEMENT_QUERY_KEYS = [
  ['mySubscription'],
  ['userData'],
  ['subscriptionPlans'],
  ['moviesData'],
  ['moviesDataById'],
  ['listRecommendedSeries'],
  ['playEpisode'],
];

/** Refetch every cache that depends on the user's subscription state. */
export const invalidateEntitlementQueries = (queryClient: QueryClient) => {
  ENTITLEMENT_QUERY_KEYS.forEach(queryKey =>
    queryClient.invalidateQueries({ queryKey }),
  );
};

/**
 * Plan codes this client may receive or send.
 *
 * There are TWO trial codes at two different post-trial prices — `TRIAL`
 * (₹1 → ₹499/yr) and `TRIAL_NEW` (₹1 → ₹899/yr) — and the backend sends the app
 * BOTH. Builds already in the field hardcode ₹499 copy and look up only `TRIAL`,
 * so `TRIAL_NEW` arrives unread and changes nothing for them. That is the
 * compatibility mechanism; there is no version negotiation.
 *
 * This build reads every price from the API, so it takes the newest trial the
 * API offers (see `pickTrialPlan`). Never branch on `=== 'TRIAL'` — use
 * `isTrialCode`, or a `TRIAL_NEW` subscriber gets treated as a paid annual one.
 */
export type PlanCode = 'MONTHLY' | 'ANNUAL' | 'TRIAL' | 'TRIAL_NEW';

/** Trial codes in ascending preference order — later entries win. */
export const TRIAL_CODES: PlanCode[] = ['TRIAL', 'TRIAL_NEW'];

/** Whether a plan code is a trial, at any price. */
export const isTrialCode = (code?: string | null): boolean =>
  code != null && TRIAL_CODES.includes(code as PlanCode);

export interface Plan {
  code: PlanCode;
  name: string;
  description: string;
  period: 'monthly' | 'yearly';
  /** PAISE. Divide by 100 to display. For a trial this is the POST-trial price. */
  price: number;
  currency: string;
  trial?: {
    days: number;
    /** Real window length; shortened from `days` only in test environments. */
    durationMinutes: number;
    /** PAISE charged today to authorise the mandate (₹1 = 100). */
    upfrontAmount: number;
  };
}

/**
 * The single trial to show, out of everything the API returned: the newest code
 * in `TRIAL_CODES` that is actually present.
 *
 * This is what stops the paywall rendering two trial cards at two prices. The
 * choice lives client-side because the server cannot tell an old build from a
 * new one — it offers both and each client takes the newest code it understands.
 */
export const pickTrialPlan = (plans?: Plan[] | null): Plan | undefined => {
  if (!Array.isArray(plans)) return undefined;
  for (let i = TRIAL_CODES.length - 1; i >= 0; i--) {
    const match = plans.find(p => p.code === TRIAL_CODES[i]);
    if (match) return match;
  }
  return undefined;
};

export interface Subscription {
  id: string;
  planCode: PlanCode;
  status: 'CREATED' | 'AUTHENTICATED' | 'PENDING' | 'ACTIVE' | 'TRIAL' | 'PAUSED' | 'HALTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  /**
   * The recurring price frozen when this subscription was created, in PAISE.
   * THE authoritative "what will I be charged next" number — a subscriber keeps
   * the price they signed up at even after the plan is re-priced, so never
   * re-derive it from a plan lookup.
   */
  amountSnapshot: number;
  /** True while inside the ₹1 trial window. Server-computed. */
  isTrial?: boolean;
  /** PAISE actually charged today (the activation fee), when in a trial. */
  upfrontAmount?: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export const isSubscriptionActive = (sub?: Subscription | null): boolean => {
  if (!sub) return false;
  const grace =
    sub.status === 'ACTIVE' ||
    sub.status === 'PENDING' ||
    sub.status === 'TRIAL' ||
    sub.status === 'CANCELLED';
  const future =
    !!sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
  return grace && future;
};

export interface SubscriptionPlansResponse {
  plans: Plan[];
  trialEligible: boolean;
}

export const getSubscriptionPlans = async (): Promise<SubscriptionPlansResponse> => {
  try {
    const response = await api(`/api/monetize/subscription/plans?_cb=${Date.now()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return {
      plans: response?.data?.plans ?? [],
      trialEligible: response?.data?.trialEligible ?? false,
    };
  } catch (error) {
    console.error('Fetch Plans Error:', error);
    throw error;
  }
};

export const createSubscription = async (planCode: PlanCode) => {
  try {
    const response = await api('/api/monetize/subscription/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { planCode },
    });
    return response?.data;
  } catch (error) {
    console.error('Create Subscription Error:', error);
    throw error;
  }
};

export const verifySubscription = async (payload: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) => {
  try {
    const response = await api('/api/monetize/subscription/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return response?.data;
  } catch (error) {
    console.error('Verify Subscription Error:', error);
    throw error;
  }
};

export const getMySubscription = async (): Promise<Subscription | null> => {
  try {
    const response = await api('/api/monetize/subscription/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response?.data?.subscription ?? null;
  } catch (error) {
    console.error('Get My Subscription Error:', error);
    return null;
  }
};

export type CancelReasonCode =
  | 'TOO_EXPENSIVE'
  | 'NOT_ENOUGH_CONTENT'
  | 'UNAWARE_OF_CHARGE'
  | 'JUST_TRYING'
  | 'NOT_WATCHING'
  | 'TECHNICAL_ISSUES'
  | 'OTHER';

// `reason` and `reasonText` are optional — the backend must tolerate their absence and ignore unknown codes, because cancellation must never fail on reason capture.
export const cancelSubscription = async (
  subscriptionId: string,
  reason?: CancelReasonCode,
  reasonText?: string,
) => {
  try {
    const body: {
      subscriptionId: string;
      reason?: CancelReasonCode;
      reasonText?: string;
    } = { subscriptionId };
    if (reason !== undefined) body.reason = reason;
    if (reasonText !== undefined) body.reasonText = reasonText;

    const response = await api('/api/monetize/subscription/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    return response?.data;
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    throw error;
  }
};



export const useSubscriptionPlans = () => {
  const user = useAuthStore(state => state.user);
  return useQuery({
    queryKey: ['subscriptionPlans', user?.id || 'anonymous'],
    queryFn: getSubscriptionPlans,
    staleTime: 0,
  });
};

export const useMySubscription = () => {
  const user = useAuthStore(state => state.user);
  return useQuery({
    queryKey: ['mySubscription', user?.id || 'anonymous'],
    queryFn: getMySubscription,
    staleTime: 0,
  });
};

export const useCreateSubscription = () => {
  return useMutation({
    mutationFn: (planCode: PlanCode) => createSubscription(planCode),
  });
};

export const useVerifySubscription = () => {
  return useMutation({
    mutationFn: (payload: {
      razorpay_payment_id: string;
      razorpay_subscription_id: string;
      razorpay_signature: string;
    }) => verifySubscription(payload),
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      subscriptionId,
      reason,
      reasonText,
    }: {
      subscriptionId: string;
      reason?: CancelReasonCode;
      reasonText?: string;
    }) => cancelSubscription(subscriptionId, reason, reasonText),
    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Subscription Cancelled',
        text2: 'Your subscription will remain active until the period ends.',
      });
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      queryClient.invalidateQueries({ queryKey: ['userData'] });
      queryClient.invalidateQueries({ queryKey: ['moviesDataById'] });
      queryClient.invalidateQueries({ queryKey: ['playEpisode'] });
    },
    onError: (error: any) => {
      const msg = error?.message || 'Failed to cancel subscription';
      Toast.show({
        type: 'error',
        text1: 'Cancellation Failed',
        text2: typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg,
      });
    },
  });
};

export interface SubscriptionCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  chargedAt: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}

export const getSubscriptionHistory = async (page = 1, limit = 20): Promise<SubscriptionCharge[]> => {
  try {
    console.log('[History API] Requesting page:', page, 'limit:', limit);
    const response = await api(`/api/monetize/subscription/history?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('[History API] Response keys:', Object.keys(response || {}));
    console.log('[History API] Response data keys:', Object.keys(response?.data || {}));

    const subscriptions = response?.data?.subscriptions ?? [];
    console.log('[History API] Subscriptions found:', subscriptions.length);
    const charges: SubscriptionCharge[] = [];

    subscriptions.forEach((sub: any, index: number) => {
      console.log(`[History API] Sub ${index} has charges:`, sub.charges ? sub.charges.length : 'none');
      if (sub.charges && Array.isArray(sub.charges)) {
        charges.push(...sub.charges);
      }
    });

    charges.sort((a, b) => {
      const dateA = new Date(a.chargedAt || a.periodStart || 0).getTime();
      const dateB = new Date(b.chargedAt || b.periodStart || 0).getTime();
      return dateB - dateA;
    });

    console.log('[History API] Total parsed charges:', charges.length);
    return charges;
  } catch (error) {
    console.error('Get Subscription History Error:', error);
    return [];
  }
};

export const useSubscriptionHistory = (page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['subscriptionHistory', page, limit],
    queryFn: () => getSubscriptionHistory(page, limit),
    staleTime: 0,
  });
};
