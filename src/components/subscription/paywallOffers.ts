import { pickTrialPlan } from '../../api/planCodes';
import type { Plan } from '../../api/planCodes';
import { APPLE_SKU_ANNUAL, APPLE_SKU_MONTHLY } from '../../config/iap';
import type { AppleCatalogue, AppleProduct } from '../../services/iap/appleIap';
import { IS_APPLE_RAIL } from '../../utils/paymentRail';

/** A price split the way the card renders it: small symbol, large amount, small period. */
export interface PriceDisplay {
  /** null when `amount` already carries the symbol, as Apple's displayPrice does. */
  currency: string | null;
  amount: string;
  period: string;
}

export interface TrialOffer {
  title: string;
  price: PriceDisplay;
  buttonLabel: string;
  footnote: string;
}

export interface PaywallOffers {
  monthly: PriceDisplay;
  annual: PriceDisplay;
  /** null when the per-month equivalent cannot be stated in the storefront's currency. */
  annualPerMonthLabel: string | null;
  savingsPercent: number | null;
  /** null hides the trial card: this rail has no trial it can honour right now. */
  trial: TrialOffer | null;
}

export interface PaywallOffersInput {
  plans?: Plan[];
  appleCatalogue?: AppleCatalogue | null;
}

const RUPEE = '₹';
const FALLBACK_MONTHLY_RUPEES = 99;
const FALLBACK_ANNUAL_RUPEES = 499;

const readPlanRupees = (plan: Plan | undefined, fallback: number): number =>
  plan ? plan.price / 100 : fallback;

const readSavingsPercent = (monthly: number, annual: number): number | null =>
  monthly > 0
    ? Math.round(((monthly * 12 - annual) / (monthly * 12)) * 100)
    : null;

// Apple prices each storefront in its own currency, so the per-month equivalent
// cannot be assembled by concatenating a hardcoded symbol. Intl is not
// guaranteed on every engine build, and a wrong-looking price is worse than no
// price, so an unformattable amount drops the line instead.
// Whole units read better for a rupee-sized figure, but rounding them off a
// dollar-sized one advertises the annual plan as "$0/month". Anything under 10
// units therefore keeps its decimals — except an exact zero, where there is no
// figure left to lose and "₹0.00" is only noise on the trial card.
const formatCurrency = (amount: number, currency: string): string | null => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: amount > 0 && amount < 10 ? 2 : 0,
    }).format(amount);
  } catch {
    return null;
  }
};

const buildRazorpayOffers = ({ plans }: PaywallOffersInput): PaywallOffers => {
  // Whichever trial this build is offered — see pickTrialPlan. There are two
  // live trial codes at different post-trial prices (TRIAL converts at ₹499,
  // TRIAL_NEW at ₹899) and the backend hands each client the set it may sell.
  const trialPlan = pickTrialPlan(plans);
  const monthlyRupees = readPlanRupees(
    plans?.find(plan => plan.code === 'MONTHLY'),
    FALLBACK_MONTHLY_RUPEES,
  );
  const annualRupees = readPlanRupees(
    plans?.find(plan => plan.code === 'ANNUAL'),
    FALLBACK_ANNUAL_RUPEES,
  );

  return {
    monthly: { currency: RUPEE, amount: `${monthlyRupees}`, period: '/month' },
    annual: { currency: RUPEE, amount: `${annualRupees}`, period: '/year' },
    annualPerMonthLabel: `Only ${RUPEE}${Math.round(annualRupees / 12)}/month`,
    savingsPercent: readSavingsPercent(monthlyRupees, annualRupees),
    trial: trialPlan ? buildRazorpayTrialCard(trialPlan) : null,
  };
};

// Every figure comes off the trial plan's OWN fields. Quoting the ANNUAL card's
// price here — which is what this did while there was only one trial — now
// understates the post-trial charge by ₹400 for a TRIAL_NEW buyer: they would be
// shown "then ₹499/year" and charged ₹899. The upfront amount and the trial
// length are read the same way rather than hardcoded, so a change to either is
// a backend edit alone.
//
// No fallback copy: without a trial plan there is no card, because every number
// on it would be invented.
const buildRazorpayTrialCard = (trialPlan: Plan): TrialOffer => {
  const upfrontRupees = (trialPlan.trial?.upfrontAmount ?? 100) / 100;
  const postTrialRupees = trialPlan.price / 100;
  const days = trialPlan.trial?.days ?? 3;

  return {
    title: trialPlan.name || `${days}-Day Trial`,
    price: { currency: RUPEE, amount: `${upfrontRupees}`, period: ' today' },
    buttonLabel: `Start for ${RUPEE}${upfrontRupees} →`,
    footnote: `${days} days full access, then ${RUPEE}${postTrialRupees}/year. Cancel anytime. The ${RUPEE}${upfrontRupees} activation fee is non-refundable.`,
  };
};

const readPerMonthLabel = (
  annualAmount: number,
  currency: string,
): string | null => {
  const formatted = formatCurrency(annualAmount / 12, currency);
  return formatted ? `Only ${formatted}/month` : null;
};

const toStorePrice = (
  product: AppleProduct | undefined,
  period: string,
  fallback: PriceDisplay,
): PriceDisplay =>
  product ? { currency: null, amount: product.displayPrice, period } : fallback;

// Apple quotes a duration ("3 days"), never a headline. Title-casing it is the
// whole transformation a period this short ever needs.
const toTitleCase = (label: string): string =>
  label.replace(/\b[a-z]/g, letter => letter.toUpperCase());

// The free days cost nothing, so there is no store price to quote and the zero
// has to be built here. A currency Intl cannot format falls back to the word
// rather than to a bare "0", which would read as a price in no currency at all.
const buildFreePrice = (currency: string): PriceDisplay => {
  const zero = formatCurrency(0, currency);
  return zero
    ? { currency: null, amount: zero, period: ' today' }
    : { currency: null, amount: 'Free', period: ' today' };
};

// The local ₹1 TRIAL plan has no Apple analogue: Apple's free days are an
// introductory offer attached to the annual product, so there is nothing
// separate to buy. The card is still the right shape for them — it is simply the
// annual product wearing its offer — and selecting it buys ANNUAL, which is what
// appleRail's toApplePlanCode already does with a TRIAL code.
//
// The card may only appear when the store itself reports both a free intro offer
// AND that this Apple ID is still eligible for it. The backend's own eligibility
// flag cannot see Apple's answer and must not stand in for it — which is why it
// is not an input here at all. Anything less would advertise free days the tap
// then charges for.
const buildAppleTrialCard = (
  annualProduct: AppleProduct | undefined,
  introOfferEligible: boolean,
  annualPrice: PriceDisplay,
): TrialOffer | null => {
  if (!annualProduct) return null;
  const introOffer = annualProduct.introOffer;
  if (!introOffer || !introOffer.isFree || !introOfferEligible) return null;
  return {
    title: `${toTitleCase(introOffer.periodLabel)} Free`,
    price: buildFreePrice(annualProduct.currency),
    buttonLabel: 'Start Free Trial →',
    footnote: `${introOffer.periodLabel} free, then ${annualPrice.amount}${annualPrice.period}. Cancel anytime in Settings.`,
  };
};

const buildAppleOffers = (input: PaywallOffersInput): PaywallOffers => {
  // The DB row is the accounting record, not the price the storefront charges,
  // so it only stands in while the store call is still in flight or has failed.
  const dbPrices = buildRazorpayOffers(input);
  const products = input.appleCatalogue?.products;
  const monthlyProduct = products?.find(
    product => product.sku === APPLE_SKU_MONTHLY,
  );
  const annualProduct = products?.find(
    product => product.sku === APPLE_SKU_ANNUAL,
  );

  const monthly = toStorePrice(monthlyProduct, '/month', dbPrices.monthly);
  const annual = toStorePrice(annualProduct, '/year', dbPrices.annual);

  const monthlyAmount = monthlyProduct?.price ?? null;
  const annualAmount = annualProduct?.price ?? null;
  const hasStoreAmounts = monthlyAmount !== null && annualAmount !== null;

  return {
    monthly,
    annual,
    annualPerMonthLabel: annualProduct?.price
      ? readPerMonthLabel(annualProduct.price, annualProduct.currency)
      : null,
    // Comparing a store price against a DB price would invent a discount, so the
    // badge is dropped unless both figures come from the same storefront.
    savingsPercent: hasStoreAmounts
      ? readSavingsPercent(monthlyAmount, annualAmount)
      : null,
    trial: buildAppleTrialCard(
      annualProduct,
      !!input.appleCatalogue?.introOfferEligible,
      annual,
    ),
  };
};

/** The prices and trial copy the active rail is actually able to honour. */
export const buildPaywallOffers = (input: PaywallOffersInput): PaywallOffers =>
  IS_APPLE_RAIL ? buildAppleOffers(input) : buildRazorpayOffers(input);
