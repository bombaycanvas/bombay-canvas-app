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

// Apple has no analogue of the local TRIAL plan: the 3 free days are an
// introductory offer attached to the annual product, so buying "the trial" on
// iOS is buying ANNUAL and letting the App Store apply the offer. Mapping it to
// a TRIAL SKU would ask for a product Apple never sold. The paywall only offers
// the trial card when the store has confirmed both the offer and this Apple ID's
// eligibility for it, so this mapping cannot quietly charge full price.
const toApplePlanCode = (planCode: SubscriptionPlanCode): ApplePlanCode =>
  planCode === 'MONTHLY' ? 'MONTHLY' : 'ANNUAL';

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
  await openManageSubscriptions();
  return { status: 'deferredToStore' };
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
