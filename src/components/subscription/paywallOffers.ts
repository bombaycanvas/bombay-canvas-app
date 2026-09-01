import type { Plan } from '../../api/subscription';
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
  trialEligible?: boolean;
  appleCatalogue?: AppleCatalogue | null;
}

const RUPEE = '₹';
const FALLBACK_MONTHLY_RUPEES = 99;
const FALLBACK_ANNUAL_RUPEES = 499;
const FALLBACK_SAVINGS_PERCENT = 58;

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

const buildRazorpayOffers = ({
  plans,
  trialEligible,
}: PaywallOffersInput): PaywallOffers => {
  const trialPlan = plans?.find(plan => plan.code === 'TRIAL');
  const monthlyRupees = readPlanRupees(
    plans?.find(plan => plan.code === 'MONTHLY'),
    FALLBACK_MONTHLY_RUPEES,
  );
  const annualRupees = readPlanRupees(
    plans?.find(plan => plan.code === 'ANNUAL'),
    FALLBACK_ANNUAL_RUPEES,
  );

  const showTrial = !!trialEligible || !!trialPlan;

  return {
    monthly: { currency: RUPEE, amount: `${monthlyRupees}`, period: '/month' },
    annual: { currency: RUPEE, amount: `${annualRupees}`, period: '/year' },
    annualPerMonthLabel: `Only ${RUPEE}${Math.round(annualRupees / 12)}/month`,
    savingsPercent:
      readSavingsPercent(monthlyRupees, annualRupees) ??
      FALLBACK_SAVINGS_PERCENT,
    trial: showTrial
      ? {
          title: trialPlan?.name || '3-Day Trial',
          price: { currency: RUPEE, amount: '1', period: ' today' },
          buttonLabel: `Start for ${RUPEE}1 →`,
          footnote: `3 days full access, then ${RUPEE}${annualRupees}/year. Cancel anytime. The ${RUPEE}1 activation fee is non-refundable.`,
        }
      : null,
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
// AND that this Apple ID is still eligible for it — the backend's trialEligible
// flag cannot see Apple's answer and must not stand in for it. Anything less
// would advertise free days the tap then charges for.
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
