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

export interface Plan {
  code: 'MONTHLY' | 'ANNUAL' | 'TRIAL';
  name: string;
  description: string;
  period: 'monthly' | 'yearly';
  price: number;
  currency: string;
  trial?: {
    days: number;
    upfrontAmount: number;
  };
}

export interface Subscription {
  id: string;
  planCode: 'MONTHLY' | 'ANNUAL' | 'TRIAL';
  status: 'CREATED' | 'AUTHENTICATED' | 'PENDING' | 'ACTIVE' | 'TRIAL' | 'PAUSED' | 'HALTED' | 'CANCELLED' | 'COMPLETED' | 'EXPIRED';
  amountSnapshot: number;
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

export const createSubscription = async (planCode: 'MONTHLY' | 'ANNUAL' | 'TRIAL') => {
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
    mutationFn: (planCode: 'MONTHLY' | 'ANNUAL' | 'TRIAL') => createSubscription(planCode),
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
