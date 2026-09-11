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

// POST /cancel refuses an App Store subscription outright, because only the user
// can cancel one and only from inside Apple's settings. The client is supposed
// to read `provider` off GET /me and never send the request at all — but a build
// talking to an older server, or a cache holding a response from before the
// field existed, will send it anyway. Branching on the code rather than on the
// message keeps that fallback working when the copy is reworded.
/** True when the server refused a cancel because Apple, not us, owns that subscription's billing. */
export const isAppleManagedCancelError = (error: unknown): boolean =>
  (error as ApiError | undefined)?.code === 'APPLE_CANCEL_NOT_SUPPORTED';

// Every cache whose contents depend on subscription state: the subscription
// itself, the denormalized user record, the content lists and detail that carry
// per-user lock flags, and the offered plans (the trial disappears once it is
// consumed). Anything that moves that state refreshes the whole set, so no
// screen is left rendering a mix.
const ENTITLEMENT_QUERY_KEYS = [
  ['mySubscription'],
  // Apple's intro-offer eligibility is spent by the purchase that consumes it,
  // so the App Store catalogue is subscription-dependent too. No-op elsewhere:
  // nothing registers this query off the Apple rail.
  ['appleCatalogue'],
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
// The plan vocabulary lives in planCodes so side-effect-free modules can use it
// without pulling this file's AsyncStorage-backed client in behind it.
// Re-exported so existing callers keep importing from here.
import type { Plan, PlanCode } from './planCodes';
import { log } from '../utils/analytics/log';
export type { Plan, PlanCode } from './planCodes';
export { TRIAL_CODES, isTrialCode, pickTrialPlan } from './planCodes';

export interface Subscription {
  id: string;
  planCode: PlanCode;
  status:
    | 'CREATED'
    | 'AUTHENTICATED'
    | 'PENDING'
    | 'ACTIVE'
    | 'TRIAL'
    | 'PAUSED'
    | 'HALTED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'EXPIRED';
  /**
   * The recurring price frozen when this subscription was created, in PAISE —
   * always INR, because it is the accounting record of the plan that was sold.
   * A subscriber keeps the price they signed up at even after the plan is
   * re-priced, so never re-derive it from a plan lookup.
   *
   * It is NOT what an App Store buyer is charged. Apple prices every storefront
   * itself, so a Californian on a $59.99 subscription still has 49900 here.
   * Anything user-facing must go through `displayAmount` first.
   */
  amountSnapshot: number;
  /**
   * Minor units of `displayCurrency` — what the storefront actually charges.
   * Apple rail only; null on Razorpay, where `amountSnapshot` + INR is correct,
   * and null on a server that predates the field.
   */
  displayAmount?: number | null;
  /** ISO-4217 code for `displayAmount`. Null on the Razorpay rail. */
  displayCurrency?: string | null;
  /** True while inside the trial window (₹1 on Razorpay, free on Apple). Server-computed. */
  isTrial?: boolean;
  /**
   * Minor units actually charged today to open the trial — the ₹1 Razorpay
   * mandate. Apple's trial costs nothing, so it is 0 there and there is no
   * activation fee to disclose.
   */
  upfrontAmount?: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
  // Which door the money came through. Only the owning provider may be asked to
  // cancel: Apple never lets an app cancel its own subscription, and the
  // Razorpay cancel endpoint refuses an Apple row outright.
  provider?: 'RAZORPAY' | 'APPLE';
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
  /**
   * PAISE the trial converts to — the post-trial charge — quoted whether or not
   * this caller may still start one.
   *
   * It is the only copy of that price once the trial is consumed, because the
   * plan carrying it leaves `plans` at that moment. The paywall strikes it
   * against the annual price.
   *
   * Null on an older server that predates the field, and on the Apple rail,
   * where the free days convert at the annual price already in `plans`. Both
   * mean "not stated" — never substitute a figure.
   */
  trialConversionAmount?: number | null;
  // Minted lazily by the backend and only for a signed-in iOS caller, so it is
  // null while anonymous. Apple needs a real UUID here to tie a purchase back to
  // this account, so the purchase path must gate on it rather than assume one.
  appleAppAccountToken?: string | null;
}

export const getSubscriptionPlans =
  async (): Promise<SubscriptionPlansResponse> => {
    try {
      const response = await api(
        `/api/monetize/subscription/plans?_cb=${Date.now()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );
      return {
        plans: response?.data?.plans ?? [],
        trialEligible: response?.data?.trialEligible ?? false,
        trialConversionAmount: response?.data?.trialConversionAmount ?? null,
        appleAppAccountToken: response?.data?.appleAppAccountToken ?? null,
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
    log.info('Subscription created', { plan_code: planCode });
    return response?.data;
  } catch (error) {
    console.error('Create Subscription Error:', error);
    log.error('Create subscription failed', {
      message: String((error as Error)?.message ?? 'unknown'),
    });
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
    log.info('Subscription verified');
    return response?.data;
  } catch (error) {
    console.error('Verify Subscription Error:', error);
    log.error('Verify subscription failed', {
      message: String((error as Error)?.message ?? 'unknown'),
    });
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
    log.info('Subscription cancelled', { subscription_id: subscriptionId });
    return response?.data;
  } catch (error) {
    console.error('Cancel Subscription Error:', error);
    log.error('Cancel subscription failed', {
      message: String((error as Error)?.message ?? 'unknown'),
    });
    throw error;
  }
};

export const useSubscriptionPlans = () => {
  const user = useAuthStore(state => state.user);
  return useQuery({
    queryKey: ['subscriptionPlans', user?.id || 'anonymous'],
    queryFn: getSubscriptionPlans,
    staleTime: 0,
    // staleTime alone does NOT get this refetched. The client-wide default is
    // refetchOnMount:false, which suppresses the fetch whenever data is already
    // in the cache however stale it is — and the cache is persisted to
    // AsyncStorage for a week, so "already there" is the normal case on launch.
    //
    // What that costs is `trialEligible`: a paywall opened after the trial was
    // consumed would keep rendering the answer from before it, offering a trial
    // that create would then refuse. Now that a mounted-at-root observer holds
    // this query from app start, opening the paywall is a SECOND observer and
    // would never have fetched at all.
    refetchOnMount: true,
  });
};

export const useMySubscription = () => {
  const user = useAuthStore(state => state.user);
  // Gated on the TOKEN, not on the cached user object, because the token is what
  // actually authorises GET /me — the server reads the caller off it and never
  // looks at anything the client holds.
  //
  // `enabled: !!user?.id` looked equivalent and is not. `user` is hydrated from
  // AsyncStorage separately from the token and can legitimately be null on a
  // perfectly valid session (nothing was ever written under 'user', or a login
  // path called setUser with an undefined payload). A disabled query is not
  // merely idle: invalidateQueries SKIPS it, while refetch() runs anyway. So a
  // cancel would invalidate ['mySubscription'] to no effect and the card kept
  // offering "Cancel Subscription" for a subscription already cancelled, right
  // up until useFocusEffect's refetch on the next visit papered over it.
  const token = useAuthStore(state => state.token);
  return useQuery({
    queryKey: ['mySubscription', user?.id || 'anonymous'],
    queryFn: getMySubscription,
    enabled: !!token,
    staleTime: 0,
    // Same defeat of staleTime as useSubscriptionPlans above, and the same fix.
    // This one decides whether the user is entitled right now, so serving it
    // from a week-old persisted cache is how a lapsed subscriber keeps being
    // treated as active.
    refetchOnMount: true,
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
        text2:
          typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg,
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

export const getSubscriptionHistory = async (
  page = 1,
  limit = 20,
): Promise<SubscriptionCharge[]> => {
  try {
    console.log('[History API] Requesting page:', page, 'limit:', limit);
    const response = await api(
      `/api/monetize/subscription/history?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );
    console.log('[History API] Response keys:', Object.keys(response || {}));
    console.log(
      '[History API] Response data keys:',
      Object.keys(response?.data || {}),
    );

    const subscriptions = response?.data?.subscriptions ?? [];
    console.log('[History API] Subscriptions found:', subscriptions.length);
    const charges: SubscriptionCharge[] = [];

    subscriptions.forEach((sub: any, index: number) => {
      console.log(
        `[History API] Sub ${index} has charges:`,
        sub.charges ? sub.charges.length : 'none',
      );
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
