import { pickTrialPlan } from '../../api/planCodes';
import type { Plan, PlanCode } from '../../api/planCodes';
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

/** The card that stands where the trial card would, once the trial is spent. */
export interface TrialConsumedNotice {
  label: string;
  body: string;
}

export interface PaywallOffers {
  monthly: PriceDisplay;
  annual: PriceDisplay;
  /** null when the per-month equivalent cannot be stated in the storefront's currency. */
  annualPerMonthLabel: string | null;
  /**
   * The post-trial price the annual card undercuts, struck through above its own
   * price. null unless a trial is on offer that converts at MORE than the plain
   * annual plan — there is nothing to strike otherwise.
   */
  annualStrikePrice: string | null;
  /**
   * How much the annual card saves, as a percentage. Measured against
   * `annualStrikePrice` when there is one, and against twelve monthly payments
   * otherwise.
   */
  savingsPercent: number | null;
  /** null hides the trial card: this rail has no trial it can honour right now. */
  trial: TrialOffer | null;
  /**
   * Which recurring plans the rail is actually offering. A plan that is not
   * offered gets no card; its price above stays resolvable either way, because
   * the screen still quotes it in copy and in the conversion it reports.
   */
  offered: { monthly: boolean; annual: boolean };
  /**
   * Set ONLY when the rail has confirmed the trial is spent. `trial` being null
   * is not that answer on its own — an unlanded plans call and a build with
   * trials switched off look identical from there, and neither may tell a user
   * they have used something they never had.
   */
  trialConsumedNotice: TrialConsumedNotice | null;
}

export interface PaywallOffersInput {
  plans?: Plan[];
  appleCatalogue?: AppleCatalogue | null;
  /**
   * `trialEligible` off GET /plans. Razorpay only: the Apple payload reports it
   * false for every caller, because the ₹1 plan is never on offer there.
   *
   * It drives the "trial used" NOTICE and nothing else. The trial CARD is still
   * decided by whether a trial the rail can honour actually came back, for the
   * reasons in buildAppleTrialCard.
   */
  trialEligible?: boolean;
}

const RUPEE = '₹';
const FALLBACK_MONTHLY_RUPEES = 99;
const FALLBACK_ANNUAL_RUPEES = 499;

const readPlanRupees = (plan: Plan | undefined, fallback: number): number =>
  plan ? plan.price / 100 : fallback;

// A plan card is dropped only when the plans call has actually landed with a set
// that excludes it. An absent or empty list means "not loaded yet", not "not
// offered" — hiding both cards there would leave a paywall with nothing to buy.
const isOffered = (plans: Plan[] | undefined, code: PlanCode): boolean =>
  !plans?.length || plans.some(plan => plan.code === code);

/** How far `to` undercuts `from`, as a percentage. Both cover the same period. */
const readDiscountPercent = (from: number, to: number): number | null =>
  from > 0 ? Math.round(((from - to) / from) * 100) : null;

const readSavingsPercent = (monthly: number, annual: number): number | null =>
  readDiscountPercent(monthly * 12, annual);

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

// What the trial converts at, for an account that has already spent one. GET
// /plans drops the trial codes the moment trialConsumedAt is set, so the figure
// the trial-ended paywall wants to strike is not in the payload at all.
//
// HARDCODED, and knowingly wrong for one group: a user who spent the ORIGINAL
// ₹1 TRIAL was converting at ₹499, not ₹899, and is shown a price they were
// never offered. The honest per-user figure is `amountSnapshot` on their own
// expired subscription row — already fetched by useMySubscription — and once
// that is plumbed through, this constant should survive only as the fallback
// for a row that has been purged.
const CONSUMED_TRIAL_CONVERSION_RUPEES = 899;

const TRIAL_USED_LEAD =
  "You've already used your free trial on this account, so it's no longer available.";

// No trial length in the copy. Once the trial is consumed the plan carrying
// `trial.days` is gone from the payload, so a "3-day" here would be a number
// this module invented — and would go on claiming three the day the backend
// offers seven. Every other figure on this screen is read from the API and this
// is held to the same rule.
//
// The closing instruction names what is actually below it: "pick a plan" reads
// as broken when the rail came back offering exactly one.
const buildTrialConsumedNotice = (offered: {
  monthly: boolean;
  annual: boolean;
}): TrialConsumedNotice => {
  const action =
    offered.monthly && offered.annual
      ? 'Pick a plan below'
      : offered.annual
      ? 'Activate the annual plan below'
      : 'Activate the monthly plan below';

  return {
    label: 'TRIAL ALREADY USED',
    body: `${TRIAL_USED_LEAD} ${action} — access starts right away.`,
  };
};

const buildRazorpayOffers = ({
  plans,
  trialEligible,
}: PaywallOffersInput): PaywallOffers => {
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

  const offered = {
    monthly: isOffered(plans, 'MONTHLY'),
    annual: isOffered(plans, 'ANNUAL'),
  };

  // The backend drops the trial codes from `plans` the moment trialConsumedAt is
  // set, so a consumed trial is exactly "no trial plan AND the server says
  // ineligible". An anonymous caller is reported eligible, so nobody is told
  // they burned a trial they never started.
  const trialConsumed = !trialPlan && trialEligible === false;

  // The trial converts at MORE than the annual plan costs outright — TRIAL_NEW
  // lands on ₹899 against a ₹499 ANNUAL. That gap, not the monthly plan, is the
  // real reason to take annual over the trial, so the card strikes the price the
  // trial converts at and rates its saving against that. Both are live prices
  // for the same year of the same product, which is what makes it a fair
  // comparison to draw.
  //
  // It applies on the trial-ended paywall too — that is where the gap argues
  // hardest — but there the price has to be supplied, because the plan carrying
  // it is gone from the payload. See CONSUMED_TRIAL_CONVERSION_RUPEES.
  //
  // Never negative: a trial converting at or below the annual price (today's
  // ₹499 TRIAL) leaves nothing to strike, and the card falls back to the
  // twelve-monthly-payments comparison.
  const trialConversionRupees = trialPlan
    ? trialPlan.price / 100
    : trialConsumed
    ? CONSUMED_TRIAL_CONVERSION_RUPEES
    : null;
  const annualStrikeRupees =
    trialConversionRupees !== null && trialConversionRupees > annualRupees
      ? trialConversionRupees
      : null;

  return {
    monthly: { currency: RUPEE, amount: `${monthlyRupees}`, period: '/month' },
    annual: { currency: RUPEE, amount: `${annualRupees}`, period: '/year' },
    annualPerMonthLabel: offered.annual
      ? `Only ${RUPEE}${Math.round(annualRupees / 12)}/month`
      : null,
    annualStrikePrice:
      offered.annual && annualStrikeRupees !== null
        ? `${RUPEE}${annualStrikeRupees}`
        : null,
    // A discount is a comparison against something the user can also see; with
    // neither the struck price nor the monthly card there is nothing left to be
    // cheaper than.
    savingsPercent: !offered.annual
      ? null
      : annualStrikeRupees !== null
      ? readDiscountPercent(annualStrikeRupees, annualRupees)
      : offered.monthly
      ? readSavingsPercent(monthlyRupees, annualRupees)
      : null,
    trial: trialPlan ? buildRazorpayTrialCard(trialPlan) : null,
    offered,
    trialConsumedNotice: trialConsumed
      ? buildTrialConsumedNotice(offered)
      : null,
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
    // Apple's free days ride on the annual product itself, so what the trial
    // converts at IS the annual price — there is never a gap to strike.
    annualStrikePrice: null,
    // Both App Store products are always on offer, and the trial-consumed notice
    // is a Razorpay-rail answer: `trialEligible` is false for every iOS caller,
    // and Apple's own introOfferEligible cannot tell "spent it" from "there was
    // never an offer here". Deriving the notice from either would accuse an
    // Apple user of using a trial they never had.
    offered: { monthly: true, annual: true },
    trialConsumedNotice: null,
  };
};

/** The prices and trial copy the active rail is actually able to honour. */
export const buildPaywallOffers = (input: PaywallOffersInput): PaywallOffers =>
  IS_APPLE_RAIL ? buildAppleOffers(input) : buildRazorpayOffers(input);
