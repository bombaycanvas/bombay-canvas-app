// ===========================================================================
// subscriptionDetailsCopy.ts — the one line of price copy the Settings card
// prints about a subscription, and nothing else.
//
// Split out of SubscriptionDetailsCard for the same reason paywallOffers is
// split out of the paywall: it is pure string-building over data the server
// already decided, and it is the part that gets a price wrong. Kept out of the
// component so it can be tested without a renderer, and only `import type` from
// api/subscription and services/iap/appleIap so nothing here drags AsyncStorage
// or react-native-iap in behind it. config/iap is safe to import for real: it is
// declarations of Apple's product ids and nothing else.
// ===========================================================================

import type { Subscription } from '../../api/subscription';
import type { AppleProduct } from '../../services/iap/appleIap';
import { APPLE_SKU_BY_PLAN_CODE } from '../../config/iap';
import { formatMinorUnits } from '../../utils/money';

// Name only — never a price. Keyed by string rather than the planCode union so a
// plan the server adds before the app ships renders a sane label instead of
// `undefined`.
//
// ANNUAL_POST_TRIAL is what every App Store subscriber's row carries, trial or
// not: Apple's free days are an introductory offer on the yearly product, so
// there is no separate trial code on that rail. It is labelled "Annual" here to
// match CancelSubscriptionFlow, which learned the same lesson.
const PLAN_NAME: Record<string, string> = {
  TRIAL: 'Trial',
  TRIAL_NEW: 'Trial',
  ANNUAL: 'Annual',
  ANNUAL_POST_TRIAL: 'Annual',
  MONTHLY: 'Monthly',
};

/** Everything about a subscription that decides what its price line reads. */
export type SubscriptionPriceFacts = Pick<
  Subscription,
  | 'planCode'
  | 'amountSnapshot'
  | 'isTrial'
  | 'upfrontAmount'
  | 'displayAmount'
  | 'displayCurrency'
  | 'provider'
>;

// Stands where the figure would be when there is no figure this row can
// honestly carry. The same mark the paywall cards use for an unpriced product
// and the card itself uses for a missing date, so an unknown price reads as
// unknown rather than as a rendering bug.
const PRICE_PLACEHOLDER = '—';

/**
 * The money this subscriber is actually charged, as minor units plus the
 * currency they are charged in — or null when this row cannot say.
 *
 * `amountSnapshot` is an INR accounting figure. It is the right answer on
 * Razorpay, where the mandate really is in rupees, and the wrong one for an App
 * Store buyer in Ohio, whose card is charged in dollars against a row that still
 * says 49900. The display pair is written only by the Apple rail and only from
 * a transaction Apple itself signed, so its presence is what marks a row whose
 * price is not rupees.
 *
 * A storefront row without a usable pair therefore has NO price to show, and
 * falling back to the rupee record for it would print exactly the wrong-currency
 * figure this module exists to stop. That is a live state, not a theoretical
 * one: Apple's free-trial transaction quotes a price of zero, so a row seeded
 * from it carries `displayAmount: 0` until the first paid renewal restates it,
 * and a zero is not a recurring price — printing it tells a subscriber mid-trial
 * that their subscription costs nothing a year.
 *
 * Half a pair — an amount with no currency, or a currency with no amount — is a
 * partially applied write or an older server, not a storefront quote, and still
 * falls back to the INR record it came from.
 */
const readPrice = (sub: SubscriptionPriceFacts): [number, string] | null => {
  if (sub.displayAmount != null && sub.displayAmount > 0 && sub.displayCurrency)
    return [sub.displayAmount, sub.displayCurrency];

  const isStorefrontRow =
    sub.provider === 'APPLE' ||
    (sub.displayAmount != null && !!sub.displayCurrency);

  return isStorefrontRow ? null : [sub.amountSnapshot, 'INR'];
};

/**
 * The App Store's own price string for the product this plan code buys, or null
 * when the catalogue cannot answer.
 *
 * `displayPrice` arrives from StoreKit already formatted for the storefront the
 * Apple ID belongs to — symbol, separators, placement and all — so it is copied
 * in verbatim. Running it through `formatMinorUnits` would mean parsing a
 * localized string back into a number, which is the operation Intl exists to
 * make unnecessary and the one that turns "1.234,56 €" into 1.234.
 *
 * The lookup goes through APPLE_SKU_BY_PLAN_CODE rather than naming the trial
 * SKU, so a monthly row resolves through the monthly product for free. The cast
 * is what makes the `undefined` branch reachable to the compiler: planCode is
 * the full PlanCode union, and the Razorpay-only codes have no Apple product.
 */
export const readStorePrice = (
  planCode: string,
  products: AppleProduct[] | null | undefined,
): string | null => {
  if (!products) return null;
  const sku = (APPLE_SKU_BY_PLAN_CODE as Record<string, string | undefined>)[
    planCode
  ];
  if (!sku) return null;
  // `||`, not `??`: displayPrice is typed non-nullable, but it is copied
  // straight off a StoreKit payload, and an empty string would be interpolated
  // into the copy as a missing figure with no placeholder to mark it.
  return products.find(product => product.sku === sku)?.displayPrice || null;
};

/**
 * What this subscriber is actually on, built from THEIR subscription rather than
 * a hardcoded table.
 *
 * The old table read "Trial ₹1 then ₹499/yr" for every trial. There are now two
 * trials at different prices, any subscriber can be on a price the current plans
 * no longer offer, and an App Store buyer is not on rupees at all — so the only
 * honest source is the row itself.
 */
export const planCopy = (
  sub: SubscriptionPriceFacts,
  products?: AppleProduct[] | null,
): string => {
  const name = PLAN_NAME[sub.planCode] ?? 'Premium plan';
  const period = sub.planCode === 'MONTHLY' ? 'month' : 'yr';
  const price = readPrice(sub);

  // The catalogue answers for a subscriber mid-trial, and ONLY for them.
  //
  // Their row has no recorded pair by design — the one transaction Apple has
  // signed for them quotes zero — and this is the window in which the card is
  // asked "what am I about to be charged?". Apple locks the price in at
  // purchase, so for a trial that started days ago the catalogue IS their
  // conversion price.
  //
  // Any other unpriced storefront row is a converted subscriber whose pair
  // predates the display columns, and there the catalogue is today's price for
  // a NEW buyer, not theirs: Apple does not move an existing subscriber onto a
  // higher tier without their consent, so the two diverge the moment prices are
  // re-tiered — and re-tiering per storefront is routine, not exceptional. They
  // keep the placeholder until their next renewal records the real pair, on the
  // principle this whole module runs on: no figure beats a figure that is not
  // theirs. A recorded pair always wins over both.
  const storePrice =
    price || !sub.isTrial ? null : readStorePrice(sub.planCode, products);
  const recurring = price
    ? `${formatMinorUnits(price[0], price[1])}/${period}`
    : `${storePrice ?? PRICE_PLACEHOLDER}/${period}`;

  // Gated on `isTrial`, which the server computes from the window the row is
  // actually in, and NOT on the plan code: Apple files a free trial under
  // ANNUAL_POST_TRIAL from day one, so a code test would tell a user mid-trial
  // that they are already being billed the yearly price.
  if (sub.isTrial) {
    // Whether there is an activation fee to disclose is the server's answer,
    // never this file's assumption. On Razorpay it is the ₹1 mandate. On Apple
    // it is whatever the introductory offer charged — free, or ₹29 up front,
    // switchable in App Store Connect without shipping a build — which is why
    // the branch is on the VALUE and not on the rail.
    //
    // Absent or zero prints nothing: "$0.00 today" reads as a charge rather
    // than as its absence. The upfront is minor units of the same currency
    // `readPrice` resolved above, so with no resolved price there is no
    // currency to state it in either.
    const today =
      price && sub.upfrontAmount != null && sub.upfrontAmount > 0
        ? formatMinorUnits(sub.upfrontAmount, price[1])
        : null;
    return today
      ? `${name} ${today} then ${recurring}`
      : `${name}, then ${recurring}`;
  }

  return `${name} ${recurring}`;
};
