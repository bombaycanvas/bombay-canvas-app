import { linkAppleTransactions } from '../../api/appleIap';
import type { ApplePlanCode } from '../../config/iap';
import {
  openManageSubscriptions,
  purchaseApplePlan,
  restoreApplePurchases,
} from '../iap/appleIap';
import type {
  CancelOutcome,
  PaymentRailAdapter,
  PurchaseOutcome,
  RestoredTransaction,
  StartPurchaseParams,
  SubscriptionPlanCode,
} from '../paymentRail';

// Apple still has no analogue of the local TRIAL / TRIAL_NEW codes: they are a
// ₹1 mandate plus a `start_at`, and an App Store introductory offer is free or a
// price tier, never ₹1. Asking StoreKit for a "TRIAL" product would ask for
// something Apple never sold.
//
// Buying the free days on iOS means buying the product they ride on, which bills
// ₹899 a year — ANNUAL_POST_TRIAL. A trial code arriving here is mapped there
// rather than to the ₹499 ANNUAL: sending it to ANNUAL would quote ₹899 on the
// card and charge ₹499, and would spend the Apple ID's group-scoped offer
// eligibility on the wrong product.
//
// The paywall only shows the trial card once the store has confirmed both the
// offer and this Apple ID's eligibility for it, so this mapping cannot quietly
// charge full price.
const toApplePlanCode = (planCode: SubscriptionPlanCode): ApplePlanCode => {
  if (planCode === 'MONTHLY') return 'MONTHLY';
  if (planCode === 'ANNUAL') return 'ANNUAL';
  return 'ANNUAL_POST_TRIAL';
};

const startPurchase = async ({
  planCode,
  appleAppAccountToken,
}: StartPurchaseParams): Promise<PurchaseOutcome> => {
  // GET /plans mints this lazily and only for a signed-in caller, so it is null
  // while anonymous and until the plans query refetches after login. Apple
  // silently drops a token that is not a UUID, and a purchase that carries none
  // reaches the webhook with no route back to this account — refuse rather than
  // sell a subscription nothing can attribute.
  if (!appleAppAccountToken) {
    throw new Error(
      'Your account is still being prepared. Please try again in a moment.',
    );
  }

  const outcome = await purchaseApplePlan({
    planCode: toApplePlanCode(planCode),
    appAccountToken: appleAppAccountToken,
  });

  switch (outcome.status) {
    case 'purchased':
      return { status: 'paid', dedupKey: outcome.transactionId };
    case 'cancelled':
      return { status: 'cancelled' };
    default:
      return { status: 'unresolved' };
  }
};

const cancel = async (): Promise<CancelOutcome> => {
  const { renewalTurnedOff } = await openManageSubscriptions();
  return { status: 'deferredToStore', renewalTurnedOff };
};

const restore = async (): Promise<RestoredTransaction[]> => {
  const signedTransactions = await restoreApplePurchases();
  if (signedTransactions.length === 0) return [];

  const result = await linkAppleTransactions(signedTransactions);
  console.log('[iap] Linked App Store purchases', {
    submitted: signedTransactions.length,
    granted: result.granted.length,
    refused: result.results.filter(entry => !entry.linked).length,
    claimedOrphans: result.claimedOrphans,
  });

  return result.results.map(entry => ({
    id: entry.originalTransactionId,
    linked: entry.linked,
    reason: entry.reason,
  }));
};

export const appleRail: PaymentRailAdapter = {
  rail: 'apple',
  startPurchase,
  cancel,
  restore,
};
