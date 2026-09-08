import RazorpayCheckout from 'react-native-razorpay';
import {
  cancelSubscription,
  createSubscription,
  isTrialCode,
  verifySubscription,
} from '../../api/subscription';
import { IS_RAZORPAY_RAIL } from '../../utils/paymentRail';
import { isCheckoutDismissal } from './razorpayError';
import type {
  CancelOutcome,
  CancelParams,
  PaymentRailAdapter,
  PurchaseOutcome,
  RestoredTransaction,
  StartPurchaseParams,
  SubscriptionPlanCode,
} from '../paymentRail';

const RAZORPAY_THEME_COLOR = '#ff6600';

// Keyed by every plan code, so adding one is a compile error here rather than a
// blank line in the Razorpay sheet. Both trials read the same to the buyer —
// they differ only in what they convert to, which the paywall footnote states.
const PLAN_DESCRIPTIONS: Record<SubscriptionPlanCode, string> = {
  TRIAL: '3-Day Trial',
  TRIAL_NEW: '3-Day Trial',
  ANNUAL: 'Annual',
  MONTHLY: 'Monthly',
};

// The SDK's option and response shapes are declared ambiently in
// src/types/react-native-razorpay.d.ts and so cannot be imported by name.
type RazorpayOptions = Parameters<typeof RazorpayCheckout.open>[0];
type RazorpayResponse = Awaited<ReturnType<typeof RazorpayCheckout.open>>;

// Defence in depth behind the rail branch in ../paymentRail: if anything ever
// reaches this adapter on iOS it must fail loudly here rather than open a
// non-Apple purchase sheet, which is a guideline 3.1.1 rejection.
const requireRazorpayRail = () => {
  if (!IS_RAZORPAY_RAIL) {
    throw new Error('Razorpay checkout is not available on this platform');
  }
};

// Razorpay's prefill wants the bare national number, not the E.164 form the
// profile stores.
const formatIndianMobile = (mobile?: string) => {
  if (!mobile) return undefined;
  const digitsOnly = mobile.replace(/\D/g, '');
  return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
};

// null means the user closed the sheet without paying. That is a normal
// outcome, not an error: rethrowing it made every caller render a failure for
// something the user chose to do — and in the cancel-flow downsell, where the
// trial has already been cancelled by then, the failure it rendered was
// "couldn't cancel" for a cancellation that had in fact succeeded.
const openCheckout = async (
  options: RazorpayOptions,
): Promise<RazorpayResponse | null> => {
  try {
    return await RazorpayCheckout.open(options);
  } catch (error) {
    if (isCheckoutDismissal(error)) {
      console.log('Razorpay checkout dismissed by user');
      return null;
    }
    console.error('Razorpay SDK error:', error);
    throw error;
  }
};

// The trial deliberately dedups on the subscription id rather than the payment
// id: the backend reports StartTrial under the subscription it opened, and a
// mismatched key would double-count the conversion.
const readDedupKey = (
  planCode: SubscriptionPlanCode,
  paymentData: RazorpayResponse,
  razorpaySubscriptionId: string,
): string =>
  isTrialCode(planCode)
    ? razorpaySubscriptionId
    : paymentData.razorpay_payment_id || razorpaySubscriptionId;

const startPurchase = async ({
  planCode,
  profile,
}: StartPurchaseParams): Promise<PurchaseOutcome> => {
  requireRazorpayRail();

  const createRes = await createSubscription(planCode);
  if (!createRes || !createRes.razorpaySubscriptionId) {
    throw new Error('Failed to create subscription on server');
  }

  const { razorpaySubscriptionId, razorpayKeyId } = createRes;

  const paymentData = await openCheckout({
    key: razorpayKeyId || 'rzp_test_123',
    subscription_id: razorpaySubscriptionId,
    name: 'Bombay Canvas',
    description: `${PLAN_DESCRIPTIONS[planCode]} Premium Subscription`,
    prefill: {
      contact: formatIndianMobile(profile?.mobile),
      email: profile?.email,
      name: profile?.name,
    },
    theme: { color: RAZORPAY_THEME_COLOR },
  });

  // Nothing was authorised and nothing is coming. Return before /verify and
  // before the dedup key is read, so no conversion can be reported for a
  // purchase that did not happen.
  if (paymentData === null) {
    return { status: 'cancelled' };
  }

  console.log(
    'Razorpay checkout completed. Payload keys:',
    Object.keys(paymentData || {}),
  );

  // Card checkout finishes inside the Razorpay sheet and always hands back the
  // signed triple. A UPI-intent mandate (GPay/PhonePe) is authorised in the
  // external app and signed by Razorpay server-side, so the payload we get back
  // can be partial — commonly payment_id only, sometimes not even that. Recover
  // the subscription id from /create, which we already hold.
  const paymentId = paymentData?.razorpay_payment_id;
  const subscriptionId =
    paymentData?.razorpay_subscription_id || razorpaySubscriptionId;
  const signature = paymentData?.razorpay_signature;

  // /verify is UX confirmation ONLY — it validates the HMAC and echoes the local
  // status back. It grants nothing: activation is webhook-driven
  // (subscription.authenticated / activated / charged). So a payload we cannot
  // sign-check, or a verify call that fails, must NOT abort the flow — the money
  // has already moved. Let the caller's GET /me poll be the sole judge of
  // whether the plan came up.
  if (paymentId && subscriptionId && signature) {
    try {
      await verifySubscription({
        razorpay_payment_id: paymentId,
        razorpay_subscription_id: subscriptionId,
        razorpay_signature: signature,
      });
    } catch (verifyError) {
      console.warn(
        'Signature verify failed; falling back to GET /me polling',
        verifyError,
      );
    }
  } else {
    console.warn('Checkout returned a partial payload; skipping signature verify', {
      paymentId: !!paymentId,
      subscriptionId: !!subscriptionId,
      signature: !!signature,
    });
  }

  return {
    status: 'paid',
    dedupKey: readDedupKey(planCode, paymentData ?? {}, razorpaySubscriptionId),
  };
};

const cancel = async ({
  subscriptionId,
  reason,
  reasonText,
}: CancelParams): Promise<CancelOutcome> => {
  requireRazorpayRail();
  await cancelSubscription(subscriptionId, reason, reasonText);
  return { status: 'cancelled' };
};

// Razorpay has no client-side restore: entitlement is already whatever the
// server says it is, and there is no store-held receipt to replay. Empty is the
// honest answer — there are no transactions to report a verdict on, which is a
// different thing from reporting that every transaction was fine.
const restore = async (): Promise<RestoredTransaction[]> => [];

export const razorpayRail: PaymentRailAdapter = {
  rail: 'razorpay',
  startPurchase,
  cancel,
  restore,
};
