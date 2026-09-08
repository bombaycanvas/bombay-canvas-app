import type { CancelReasonCode, PlanCode, Subscription } from '../api/subscription';
import { PAYMENT_RAIL } from '../utils/paymentRail';
import type { PaymentRail } from '../utils/paymentRail';
import { appleRail } from './payments/appleRail';
import { razorpayRail } from './payments/razorpayRail';

export type { PaymentRail };

/** The rail this build sells through. */
export const rail: PaymentRail = PAYMENT_RAIL;

// An alias, not a second union. A local copy would silently omit whatever trial
// code is added next, and the omission would surface as a checkout that cannot
// be started rather than as a type error.
export type SubscriptionPlanCode = PlanCode;

/** Checkout prefill. Razorpay uses it; Apple takes the identity from the Apple ID. */
export interface PurchaseProfile {
  name?: string;
  email?: string;
  mobile?: string;
}

export interface StartPurchaseParams {
  planCode: SubscriptionPlanCode;
  profile?: PurchaseProfile | null;
  /** Apple's per-user UUID from GET /plans. Ignored by Razorpay. */
  appleAppAccountToken?: string | null;
}

// `dedupKey` is the id the backend will report the same conversion under, so the
// Meta event fired here merges with the server's instead of double-counting.
// Each rail knows its own: Razorpay's payment/subscription id, Apple's
// transaction id.
//
// `unresolved` is neither: the store never told us how the attempt ended, so the
// money may or may not have moved. The caller must poll entitlement rather than
// claim a sale or report a failure.
export type PurchaseOutcome =
  | { status: 'paid'; dedupKey: string }
  | { status: 'cancelled' }
  | { status: 'unresolved' };

export interface CancelParams {
  subscriptionId: string;
  reason?: CancelReasonCode;
  reasonText?: string;
}

// Apple never lets an app cancel a subscription — the most it can do is open the
// system sheet — so the caller has to know whether anything was actually
// cancelled before it tells the user it was.
export type CancelOutcome =
  | { status: 'cancelled' }
  | { status: 'deferredToStore' };

// A restore is not just a count of what was recovered. A rail can hold a receipt
// this account is not allowed to own — on Apple, because the subscription behind
// it is already bound to a different Canvas account — and that refusal is the
// only pre-purchase warning there is that a fresh purchase would be charged and
// then declined. `reason` carries the server's typed code so a caller can tell
// "nothing to restore" apart from "we are not allowed to restore this".
/** One purchase the rail still held, and whether this account may own it. */
export interface RestoredTransaction {
  id: string;
  linked: boolean;
  /** The server's typed refusal code when `linked` is false. */
  reason?: string;
}

/** What every rail must be able to do, so screens can call one thing. */
export interface PaymentRailAdapter {
  readonly rail: PaymentRail;
  startPurchase(params: StartPurchaseParams): Promise<PurchaseOutcome>;
  cancel(params: CancelParams): Promise<CancelOutcome>;
  restore(): Promise<RestoredTransaction[]>;
}

const ADAPTERS: Record<PaymentRail, PaymentRailAdapter> = {
  apple: appleRail,
  razorpay: razorpayRail,
};

// The single branch point. Razorpay's checkout is reachable only through the
// adapter this returns, so on iOS there is no code path to it at all — the
// button is not hidden, the call site is gone.
/** The adapter for the active rail. */
export const getPaymentRail = (): PaymentRailAdapter => ADAPTERS[rail];

// An existing subscription is owned by the rail that sold it, which is not
// always the rail this build sells through: a grandfathered iOS user still holds
// a Razorpay mandate, and an Apple subscription is visible from the Android app
// on the same account. Managing one through the wrong rail would either call
// Razorpay's cancel endpoint with an Apple subscription id — which the server
// refuses — or open a store sheet that knows nothing about the mandate.
/** The adapter that owns an existing subscription. Defaults to Razorpay, as the column does. */
export const getRailForSubscription = (
  provider?: Subscription['provider'],
): PaymentRailAdapter =>
  provider === 'APPLE' ? ADAPTERS.apple : ADAPTERS.razorpay;
