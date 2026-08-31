import {
  ErrorCode,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  isEligibleForIntroOfferIOS,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  showManageSubscriptionsIOS,
} from 'react-native-iap';
import type {
  EventSubscription,
  ProductOrSubscription,
  ProductSubscriptionIOS,
  Purchase,
  PurchaseError,
} from 'react-native-iap';
import Toast from 'react-native-toast-message';
import queryClient from '../../config/queryClient';
import { invalidateEntitlementQueries } from '../../api/subscription';
import { verifyAppleTransaction } from '../../api/appleIap';
import {
  APPLE_SKUS,
  APPLE_SKU_BY_PLAN_CODE,
  APPLE_SUBSCRIPTION_GROUP_ID,
  isKnownAppleSku,
} from '../../config/iap';
import type { ApplePlanCode } from '../../config/iap';
import { IS_APPLE_RAIL } from '../../utils/paymentRail';
import {
  APPLE_OWNERSHIP_CONFLICT_CODE,
  setAppleOwnershipConflict,
} from '../../components/subscription/appleOwnershipConflict';
import { classifyVerifyFailure } from './verifyFailure';

/** An introductory offer as Apple defines it — never as the local Plan row does. */
export interface AppleIntroOffer {
  periodLabel: string;
  isFree: boolean;
  displayPrice: string | null;
}

/** One App Store product, carrying the store's own price string. */
export interface AppleProduct {
  sku: string;
  displayPrice: string;
  title: string;
  description: string;
  price: number | null;
  currency: string;
  introOffer: AppleIntroOffer | null;
}

/** What the paywall may show. Eligibility is per Apple ID, so only Apple can answer it. */
export interface AppleCatalogue {
  products: AppleProduct[];
  introOfferEligible: boolean;
}

/** Cancelling out of the App Store sheet is an outcome, not an error. */
export type ApplePurchaseOutcome =
  | { status: 'purchased'; productId: string; transactionId: string }
  | { status: 'cancelled' }
  | { status: 'unresolved' };

interface PendingPurchase {
  sku: string;
  resolve: (outcome: ApplePurchaseOutcome) => void;
  reject: (error: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// Long enough to cover a slow sheet, a password re-entry and a Face ID retry;
// short enough that a StoreKit event which never arrives cannot pin the paywall
// under a spinner until the app is restarted.
const PURCHASE_TIMEOUT_MS = 10 * 60 * 1000;

let connection: Promise<void> | null = null;
let listeners: EventSubscription[] = [];
let pendingPurchase: PendingPurchase | null = null;
// Set synchronously on entry, unlike pendingPurchase, which cannot exist until
// the connection and product fetch have been awaited. Without it a double tap
// gets past the re-entrancy check during those awaits and the second request
// orphans the first caller's promise.
let purchaseInFlight = false;

// Every entry point asserts the rail instead of quietly no-opping. A Razorpay
// build reaching StoreKit is a wiring bug, and a silent no-op would surface as a
// paywall whose button does nothing rather than as a stack trace.
const requireAppleRail = (action: string) => {
  if (!IS_APPLE_RAIL) {
    throw new Error(
      `Apple IAP is not the active payment rail; cannot ${action}`,
    );
  }
};

// On iOS the unified purchaseToken IS the signed transaction (JWS) that the
// server verifies against Apple's public keys. Nothing else in the payload is
// trustworthy, so this is the only field that ever leaves the device.
const readSignedTransaction = (purchase: Purchase): string | null =>
  typeof purchase.purchaseToken === 'string' &&
  purchase.purchaseToken.length > 0
    ? purchase.purchaseToken
    : null;

const readTransactionId = (purchase: Purchase): string =>
  purchase.transactionId || purchase.id;

// Claims the in-flight purchase only when the delivery is plausibly its own.
// StoreKit replays every unfinished transaction it still holds — including ones
// from earlier sessions — so a delivery for a different SKU must not settle the
// promise the buy button is awaiting with someone else's transaction id.
const takePending = (sku?: string | null): PendingPurchase | null => {
  const pending = pendingPurchase;
  if (!pending) return null;
  if (sku && pending.sku !== sku) return null;
  pendingPurchase = null;
  clearTimeout(pending.timeout);
  return pending;
};

// StoreKit replays an unfinished transaction on every launch, and before this
// module learned to finish a terminally refused one it could replay for months.
// Those queued transactions are still out there on installed devices, so the
// first replay of each is allowed to explain itself and the rest are silenced —
// a user who cannot act on the message does not need to be told again, and the
// listener fires with no screen in front of it as often as not.
const announcedRefusals = new Set<string>();

const announceRefusal = (transactionId: string, message?: string) => {
  if (!message || announcedRefusals.has(transactionId)) return;
  announcedRefusals.add(transactionId);
  Toast.show({
    type: 'info',
    text1: 'Subscription Not Applied',
    text2: message,
    visibilityTime: 8000,
  });
};

// Finishing is what breaks the loop, so it must happen even if the toast does
// not: a failure here leaves the transaction queued and the user back in the
// replay it was meant to end.
const finishRefusedTransaction = async (
  purchase: Purchase,
  message?: string,
): Promise<void> => {
  const transactionId = readTransactionId(purchase);
  // warn, not error: this is a handled outcome with a decided response, and
  // console.error puts a full-screen LogBox in front of a developer for
  // something that is working exactly as designed.
  console.warn('[iap] Verify refused this transaction for good; finishing it', {
    productId: purchase.productId,
    transactionId,
  });

  announceRefusal(transactionId, message);

  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (error) {
    console.warn('[iap] finishTransaction failed after a terminal refusal', {
      transactionId,
      error,
    });
  }
};

const grantAndFinish = async (
  purchase: Purchase,
): Promise<ApplePurchaseOutcome> => {
  const signedTransaction = readSignedTransaction(purchase);
  if (!signedTransaction) {
    console.warn('[iap] Purchase carried no signed transaction', {
      productId: purchase.productId,
      transactionId: readTransactionId(purchase),
    });
    throw new Error('The App Store returned a purchase we cannot verify');
  }

  try {
    await verifyAppleTransaction(signedTransaction);
  } catch (error) {
    const verdict = classifyVerifyFailure(error);

    if (verdict.kind === 'retryable') {
      // Deliberately NOT finished. An unfinished transaction is replayed by
      // StoreKit on every launch, and that replay is the only thing standing
      // between a failed verify call and a user who paid but is not entitled.
      console.error('[iap] Verify failed; leaving the transaction queued', {
        productId: purchase.productId,
        transactionId: readTransactionId(purchase),
        error,
      });
      throw error;
    }

    // The refusal the paywall cares about, learned first-hand. The launch
    // restore writes this verdict too, but it can fail — offline, a 500 — and
    // when it does this is the only evidence on the device that buying again
    // would be charged and then declined. Publishing it here means the buy
    // buttons go inert on the strength of whichever source actually answered.
    if (verdict.code === APPLE_OWNERSHIP_CONFLICT_CODE) {
      setAppleOwnershipConflict(queryClient, {
        transactionId: readTransactionId(purchase),
      });
    }

    // Terminal: the server has already recorded this transaction and made a
    // decision that resubmitting the same JWS cannot change. Leaving it queued
    // would replay the identical failure on every launch for the life of the
    // install, so it is finished — the queue is drained, and the message below
    // is the one thing the user actually needs.
    await finishRefusedTransaction(purchase, verdict.message);
    throw error;
  }

  invalidateEntitlementQueries(queryClient);

  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch (error) {
    // The grant already landed, so this is queue hygiene rather than a payment
    // failure: the next launch replays the transaction, the server verify is
    // idempotent, and finishing gets another attempt.
    console.warn('[iap] finishTransaction failed after a successful verify', {
      transactionId: readTransactionId(purchase),
      error,
    });
  }

  console.log('[iap] Entitlement granted', {
    productId: purchase.productId,
    transactionId: readTransactionId(purchase),
  });
  return {
    status: 'purchased',
    productId: purchase.productId,
    transactionId: readTransactionId(purchase),
  };
};

// Every delivery is granted, whether or not anyone is waiting on it — that is
// what turns StoreKit's launch replay into a second chance at a grant we failed
// to make last session.
const settlePurchase = async (purchase: Purchase): Promise<void> => {
  try {
    const outcome = await grantAndFinish(purchase);
    takePending(purchase.productId)?.resolve(outcome);
  } catch (error) {
    takePending(purchase.productId)?.reject(error);
  }
};

const handlePurchaseError = (error: PurchaseError) => {
  // StoreKit does not always name the product on an error. At most one purchase
  // is ever in flight, so an unattributed failure is still ours to settle —
  // dropping it would leave the caller waiting for the timeout.
  const pending = takePending(error.productId);
  if (error.code === ErrorCode.UserCancelled) {
    pending?.resolve({ status: 'cancelled' });
    return;
  }
  console.error('[iap] Purchase failed', {
    code: error.code,
    productId: error.productId,
    message: error.message,
  });
  pending?.reject(
    new Error(error.message || 'The App Store could not complete the purchase'),
  );
};

// Registered at connection time, before any purchase can be requested.
// requestPurchase is event-based and never resolves with the purchase, so a
// listener installed after it would lose the transaction outright; installing
// them here also catches the deliveries that arrive with no purchase in flight
// — StoreKit's launch replay of unfinished transactions, and Ask-to-Buy
// approvals that land days later.
const registerListeners = () => {
  if (listeners.length > 0) return;
  listeners = [
    purchaseUpdatedListener(purchase => {
      settlePurchase(purchase).catch(error =>
        console.error('[iap] Failed to settle a purchase', error),
      );
    }),
    purchaseErrorListener(handlePurchaseError),
  ];
};

const openConnection = async (): Promise<void> => {
  await initConnection();
  registerListeners();
};

/** Opens the StoreKit connection and installs the transaction listeners; idempotent. */
export const initIap = async (): Promise<void> => {
  requireAppleRail('initialise the store connection');
  if (!connection) {
    connection = openConnection();
  }
  try {
    await connection;
  } catch (error) {
    // A transient connect failure must not poison every later attempt.
    connection = null;
    throw error;
  }
};

/** Releases the store connection and listeners. Never throws — this is cleanup. */
export const teardownIap = async (): Promise<void> => {
  listeners.forEach(subscription => subscription.remove());
  listeners = [];
  // Settling rather than dropping: with the listeners gone nothing can ever
  // resolve this promise, and an abandoned one leaves the paywall spinning.
  takePending()?.reject(new Error('The App Store connection was closed'));
  if (!connection) return;
  connection = null;
  try {
    await endConnection();
  } catch (error) {
    console.warn('[iap] endConnection failed', error);
  }
};

const isIosSubscription = (
  product: ProductOrSubscription,
): product is ProductSubscriptionIOS =>
  product.platform === 'ios' && product.type === 'subs';

// Apple reports the offer's duration as a count plus a unit, never as a phrase.
// A mode of "empty" means the product carries no introductory offer at all.
const readIntroOffer = (
  product: ProductSubscriptionIOS,
): AppleIntroOffer | null => {
  const paymentMode = product.introductoryPricePaymentModeIOS;
  const unit = product.introductoryPriceSubscriptionPeriodIOS;
  const periods = Number(product.introductoryPriceNumberOfPeriodsIOS);
  if (!paymentMode || paymentMode === 'empty') return null;
  if (!unit || unit === 'empty') return null;
  if (!Number.isFinite(periods) || periods <= 0) return null;
  return {
    periodLabel: `${periods} ${unit}${periods === 1 ? '' : 's'}`,
    isFree: paymentMode === 'free-trial',
    displayPrice: product.introductoryPriceIOS ?? null,
  };
};

const toAppleProduct = (product: ProductOrSubscription): AppleProduct => ({
  sku: product.id,
  displayPrice: product.displayPrice,
  title: product.title,
  description: product.description,
  price: product.price ?? null,
  currency: product.currency,
  introOffer: isIosSubscription(product) ? readIntroOffer(product) : null,
});

/** The App Store's own price and copy — display these, never the DB price. */
export const getAppleProducts = async (): Promise<AppleProduct[]> => {
  requireAppleRail('fetch products');
  await initIap();
  const products: ProductOrSubscription[] =
    (await fetchProducts({ skus: [...APPLE_SKUS], type: 'subs' })) ?? [];
  return products
    .filter(product => isKnownAppleSku(product.id))
    .map(toAppleProduct);
};

/** Prices plus whether this Apple ID may still take the introductory offer. */
export const getAppleCatalogue = async (): Promise<AppleCatalogue> => {
  const products = await getAppleProducts();

  // Apple is the sole authority here: eligibility is per Apple ID and
  // subscription group, and the backend's own trial flag cannot see it. A failed
  // check therefore has to read as "not eligible" — offering free days Apple
  // will not honour means charging the full price at the tap.
  let introOfferEligible = false;
  try {
    introOfferEligible = await isEligibleForIntroOfferIOS(
      APPLE_SUBSCRIPTION_GROUP_ID,
    );
  } catch (error) {
    console.warn('[iap] Intro-offer eligibility check failed', error);
  }

  return { products, introOfferEligible };
};

const requestApplePurchase = async (
  sku: string,
  appAccountToken: string,
): Promise<ApplePurchaseOutcome> => {
  // Connect first: this is what guarantees the listeners are live before
  // requestPurchase is dispatched.
  await initIap();

  // The native layer decides how to decode a purchase request from the product
  // type it cached during a fetch. Without a prior fetch it falls back to
  // one-time-product decoding and silently discards type: 'subs', so this call
  // is part of the purchase, not a display concern.
  await getAppleProducts();

  const outcome = new Promise<ApplePurchaseOutcome>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // StoreKit went silent — a stalled sheet, an Ask-to-Buy approval that will
      // land days later, or a dropped event. Resolve rather than reject: the
      // money may well have moved, and the caller's activation poll is a better
      // judge of that than a failure toast would be.
      console.warn('[iap] No store event for the requested purchase', { sku });
      takePending(sku)?.resolve({ status: 'unresolved' });
    }, PURCHASE_TIMEOUT_MS);
    pendingPurchase = { sku, resolve, reject, timeout };
  });

  console.log('[iap] Requesting purchase', { sku });
  try {
    await requestPurchase({
      request: { apple: { sku, appAccountToken } },
      type: 'subs',
    });
  } catch (error) {
    takePending(sku)?.reject(error);
  }

  return outcome;
};

/** Buys a plan; resolves only once the server has granted the entitlement. */
export const purchaseApplePlan = async ({
  planCode,
  appAccountToken,
}: {
  planCode: ApplePlanCode;
  appAccountToken: string;
}): Promise<ApplePurchaseOutcome> => {
  requireAppleRail('start a purchase');
  if (purchaseInFlight) {
    throw new Error('An App Store purchase is already in progress');
  }

  const sku = APPLE_SKU_BY_PLAN_CODE[planCode];
  if (!sku) {
    throw new Error(`No Apple product is configured for plan ${planCode}`);
  }

  purchaseInFlight = true;
  try {
    return await requestApplePurchase(sku, appAccountToken);
  } finally {
    purchaseInFlight = false;
  }
};

/** Every JWS the App Store still holds for this Apple ID — the input to /apple/link. */
export const restoreApplePurchases = async (): Promise<string[]> => {
  requireAppleRail('restore purchases');
  await initIap();
  const purchases = await getAvailablePurchases();
  return purchases
    .map(readSignedTransaction)
    .filter(
      (signedTransaction): signedTransaction is string =>
        signedTransaction !== null,
    );
};

/** Apple owns cancellation; the app can only open the system sheet. */
export const openManageSubscriptions = async (): Promise<void> => {
  requireAppleRail('open manage subscriptions');
  await initIap();
  await showManageSubscriptionsIOS();
};
