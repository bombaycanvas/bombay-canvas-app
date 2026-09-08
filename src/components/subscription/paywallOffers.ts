import { pickTrialPlan } from '../../api/planCodes';
import type { Plan, PlanCode } from '../../api/planCodes';
import {
  APPLE_SKU_ANNUAL,
  APPLE_SKU_ANNUAL_TRIAL,
  APPLE_SKU_MONTHLY,
} from '../../config/iap';
import type {
  AppleCatalogue,
  AppleIntroOffer,
  AppleProduct,
} from '../../services/iap/appleIap';
import { IS_APPLE_RAIL } from '../../utils/paymentRail';

/** A price split the way the card renders it: small symbol, large amount, small period. */
export interface PriceDisplay {
  /** null when `amount` already carries the symbol, as Apple's displayPrice does. */
  currency: string | null;
  /**
   * null when no figure this rail would actually charge could be obtained. The
   * card then draws a placeholder in its place; it never falls back to a price
   * from somewhere else, because on the Apple rail the DB's rupee figure is not
   * what the storefront bills a US or Japanese buyer. Only ever null on Apple.
   */
  amount: string | null;
  period: string;
}

export interface TrialOffer {
  /**
   * The plan code tapping this card buys.
   *
   * Carried on the offer rather than re-derived at tap time, because the two
   * rails answer it differently: Razorpay sells whichever trial code came back
   * in `plans`, Apple sells the ₹899 yearly plan its free-days product bills
   * against. Re-deriving it from `plans` on iOS found no trial code at all and
   * left the card unbuyable.
   */
  planCode: PlanCode;
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

/** The hero's savings callout: a figure and what it was measured against. */
export interface SavingsNote {
  /** "Save ₹400" — the gap itself, never a percentage of an unnamed base. */
  headline: string;
  /** The other price the gap was measured from, in words. */
  body: string;
}

/**
 * Copy for the annual-hero layout, which leads with the annual card and demotes
 * the trial to a secondary choice beside monthly.
 *
 * Every string here is assembled from a price the rail has actually quoted, so
 * a figure the store never gave leaves its line null rather than falling back to
 * one — the same rule the price fields above follow, applied to prose.
 *
 * Null on the Razorpay rail, which renders the older trial-first layout.
 */
export interface PaywallHeroCopy {
  /** The hero action, carrying the price the tap charges. */
  ctaLabel: string;
  savings: SavingsNote | null;
  /** The line under the hero action. */
  footnote: string;
  /** Why someone would pick the secondary card, one line each. */
  monthlyNote: string;
  /** Null exactly when there is no trial card to explain. */
  trialNote: string | null;
  /** "Then ₹899.00/year" under the trial card's own price. */
  trialConversionLabel: string | null;
  /**
   * Fine print for the whole sheet, per selected card. The screen shows the one
   * belonging to the card the user is actually about to buy; the trial's fine
   * print is `trial.footnote`, which already states both of its prices.
   */
  renewalNote: { monthly: string | null; annual: string | null };
}

export interface PaywallOffers {
  monthly: PriceDisplay;
  annual: PriceDisplay;
  /**
   * True when a rail-correct price could not be obtained. The cards must render
   * a placeholder rather than any figure, and the buy action for an unpriced
   * card is inert: the App Store would charge an amount the user was never
   * shown. Only ever true on Apple, where the price lives in the store and not
   * in our database.
   */
  pricesUnavailable: boolean;
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
  /** See PaywallHeroCopy. Null on rails that render the trial-first layout. */
  heroCopy: PaywallHeroCopy | null;
}

export interface PaywallOffersInput {
  plans?: Plan[];
  appleCatalogue?: AppleCatalogue | null;
  /**
   * The catalogue query's own verdict, from useAppleCatalogue. An absent
   * catalogue is read as "no price yet" either way, so these do not change
   * which figure is shown — they exist so the answer is the query's and is not
   * inferred from the shape of a payload that never arrived.
   *
   * Both are consulted ONLY while no catalogue has landed at all. react-query
   * keeps the last good catalogue through a failed refetch, and a price the
   * store has already given is still the right price to show.
   */
  appleCatalogueLoading?: boolean;
  appleCatalogueError?: boolean;
  /**
   * `trialEligible` off GET /plans. Razorpay only: the Apple payload reports it
   * false for every caller, because the ₹1 plan is never on offer there.
   *
   * It drives the "trial used" NOTICE and nothing else. The trial CARD is still
   * decided by whether a trial the rail can honour actually came back, for the
   * reasons in buildAppleTrialCard.
   */
  trialEligible?: boolean;
  /**
   * `trialConversionAmount` off GET /plans, in PAISE: what a trial converts to,
   * quoted even after the trial plan itself has left the offered set. It is the
   * only source for the price the trial-ended paywall strikes.
   *
   * Absent or null means the server did not state one — an older build of the
   * API, or trials switched off entirely. Never substitute a figure for it.
   */
  trialConversionAmount?: number | null;
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
  trialConversionAmount,
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
  //
  // Deliberately NOT gated on the conversion price below: the banner and the
  // trial-ended prompt are about eligibility, and an API that cannot quote a
  // price must cost the screen its struck figure, never its explanation.
  const trialConsumed = !trialPlan && trialEligible === false;

  // What the trial converts at, once its plan is gone from the payload. Null
  // means the server did not state one — an older build of the API — and the
  // card then strikes nothing rather than inventing a figure.
  const serverConversionRupees =
    typeof trialConversionAmount === 'number'
      ? trialConversionAmount / 100
      : null;

  // The trial converts at MORE than the annual plan costs outright — TRIAL_NEW
  // lands on ₹899 against a ₹499 ANNUAL. That gap, not the monthly plan, is the
  // real reason to take annual over the trial, so the card strikes the price the
  // trial converts at and rates its saving against that. Both are live prices
  // for the same year of the same product, which is what makes it a fair
  // comparison to draw.
  //
  // It applies on the trial-ended paywall too — that is where the gap argues
  // hardest — and there the figure can only come from the server, because the
  // plan carrying it has left the payload.
  //
  // The rendered card wins while there is one: it is the price the footnote
  // directly above already promises, and a strike disagreeing with the card it
  // sits under is worse than no strike.
  //
  // Never negative: a trial converting at or below the annual price (today's
  // ₹499 TRIAL) leaves nothing to strike, and the card falls back to the
  // twelve-monthly-payments comparison.
  const trialConversionRupees = trialPlan
    ? trialPlan.price / 100
    : trialConsumed
    ? serverConversionRupees
    : null;
  const annualStrikeRupees =
    trialConversionRupees !== null && trialConversionRupees > annualRupees
      ? trialConversionRupees
      : null;

  return {
    // The DB row IS the charged price on this rail, and readPlanRupees always
    // resolves to a number, so there is no unpriced state to represent here.
    pricesUnavailable: false,
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
    // This rail keeps the trial-first layout: its hook is the ₹1 charge, not a
    // free window, and the annual card has no free trial to be measured against.
    heroCopy: null,
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
    planCode: trialPlan.code,
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
  return formatted ? `That's just ${formatted}/month` : null;
};

// No fallback. The DB price is an INR accounting figure; quoting it to a buyer
// the App Store will charge in dollars is a wrong price, and a wrong price is
// worse than no price at all.
const toStorePrice = (
  product: AppleProduct | undefined,
  period: string,
): PriceDisplay => ({
  currency: null,
  amount: product ? product.displayPrice : null,
  period,
});

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

// "3 days" pluralised for a headline: "3-Day", "1-Month".
const toHeadlineDuration = (introOffer: AppleIntroOffer): string =>
  `${introOffer.periods}-${toTitleCase(introOffer.unitLabel)}`;

// The card's three shapes, one per payment mode Apple offers. Which one is live
// is App Store Connect's answer, not this build's: switching the offer from free
// days to a paid intro is a change made in the console, and every figure and
// every word below is read back from the store so that switch lands on the
// paywall without a release.
//
// The upfront price is the amount the tap actually charges TODAY, and the
// footnote always names both that and what it converts to, because those are two
// different numbers in every mode except a plain renewal.
const buildAppleIntroCard = (
  introOffer: AppleIntroOffer,
  currency: string,
  conversion: string,
): Pick<TrialOffer, 'title' | 'price' | 'buttonLabel' | 'footnote'> | null => {
  const introPrice = introOffer.displayPrice;

  // A free-trial card is drawn ONLY for an offer Apple calls free. readIntroOffer
  // already drops a paid offer it has no price for, and this says the same thing
  // a second time on purpose: the alternative to a null here is a card reading
  // "3 days free" over an offer that charges, which is the worst outcome on this
  // screen and is one dropped field away at all times.
  if (introOffer.paymentMode !== 'free-trial' && !introPrice) return null;

  if (introOffer.paymentMode === 'pay-as-you-go' && introPrice) {
    // A reduced price charged every period for the length of the offer. The
    // period belongs beside the price here — "$2" alone would read as the whole
    // intro cost when it is charged three times.
    return {
      title: `${toHeadlineDuration(introOffer)} Intro`,
      price: {
        currency: null,
        amount: introPrice,
        period: `/${introOffer.unitLabel}`,
      },
      buttonLabel: `Start for ${introPrice} →`,
      footnote: `${introPrice}/${introOffer.unitLabel} for ${introOffer.periodLabel}, then ${conversion}`,
    };
  }

  if (introOffer.paymentMode === 'pay-up-front' && introPrice) {
    // One payment buys the whole intro window, so it is charged today and the
    // period reads " today" exactly as the ₹1 Razorpay trial's does.
    return {
      title: `${toHeadlineDuration(introOffer)} Trial`,
      price: { currency: null, amount: introPrice, period: ' today' },
      buttonLabel: `Start for ${introPrice} →`,
      footnote: `${introOffer.periodLabel} for ${introPrice}, then ${conversion}`,
    };
  }

  // Titled by the window Apple reports rather than by the word "free", so the
  // card reads as the third plan it now is ("3-Day Trial" beside "Monthly" and
  // "Annual") instead of as a headline. The price beside it already says free.
  return {
    title: `${toHeadlineDuration(introOffer)} Trial`,
    price: buildFreePrice(currency),
    buttonLabel: 'Start Free Trial →',
    footnote: `${introOffer.periodLabel} free, then ${conversion}`,
  };
};

// The local ₹1 TRIAL plan has no Apple analogue — an App Store introductory
// offer is free or a price tier, never ₹1 — so on this rail the intro period
// rides its OWN product, which then bills ₹899 a year. Selecting the card buys
// that product, i.e. ANNUAL_POST_TRIAL.
//
// Every figure comes off the trial product itself. Quoting the ₹499 ANNUAL card
// beside it — which is what this did while the free days were an offer ON that
// product — now understates the conversion by ₹400: the card would read "then
// ₹499.00/year" while the App Store charges ₹899. That is the same mis-sell the
// TRIAL / TRIAL_NEW split exists to prevent on Razorpay.
//
// The card may only appear when the store itself reports both an intro offer AND
// that this Apple ID is still eligible for it. The backend's own eligibility
// flag cannot see Apple's answer and must not stand in for it — which is why it
// is not an input here at all. Anything less would advertise an offer the tap
// does not honour.
//
// Deliberately NOT gated on the offer being free. Eligibility is per Apple ID
// and subscription group whatever the offer charges, so a paid intro is subject
// to the same check — and a build that only rendered free days would silently
// drop the card the day the offer changed in App Store Connect, taking the
// paywall's whole hook with it.
const buildAppleTrialCard = (
  trialProduct: AppleProduct | undefined,
  introOfferEligible: boolean,
  trialProductPrice: PriceDisplay | null,
): TrialOffer | null => {
  if (!trialProduct || !trialProductPrice?.amount) return null;
  const introOffer = trialProduct.introOffer;
  if (!introOffer || !introOfferEligible) return null;
  const card = buildAppleIntroCard(
    introOffer,
    trialProduct.currency,
    `${trialProductPrice.amount}${trialProductPrice.period}. Cancel anytime in Settings.`,
  );
  if (!card) return null;
  return { planCode: 'ANNUAL_POST_TRIAL', ...card };
};

const SAVINGS_VS_TRIAL = 'compared with starting with the trial';
const SAVINGS_VS_MONTHLY = 'compared with paying monthly';

// The gap between the annual price and whatever the hero is arguing against, in
// the storefront's own currency. Null unless BOTH figures came from the store
// and the annual one is genuinely lower — a "Save" line the user can check
// against two prices printed on the same screen, or no line at all.
const buildSavingsNote = (
  annualAmount: number | null,
  comparedAmount: number | null,
  currency: string | undefined,
  body: string,
): SavingsNote | null => {
  if (annualAmount === null || comparedAmount === null || !currency)
    return null;
  if (comparedAmount <= annualAmount) return null;
  const saved = formatCurrency(comparedAmount - annualAmount, currency);
  return saved ? { headline: `Save ${saved}`, body } : null;
};

// The trial converts on its own product at more than the plain annual costs, so
// taking the free days first is the more expensive first year. That gap is the
// hero's whole argument, and it is the same figure the trial card owns up to.
//
// Falls back to twelve monthly payments when there is no trial on offer: the
// comparison has to name a price the user can also see, and with the trial card
// gone the monthly card is the only other one left.
const buildAnnualSavings = (
  annualAmount: number | null,
  monthlyAmount: number | null,
  trialConversionAmount: number | null,
  currency: string | undefined,
): SavingsNote | null =>
  buildSavingsNote(
    annualAmount,
    trialConversionAmount,
    currency,
    SAVINGS_VS_TRIAL,
  ) ??
  buildSavingsNote(
    annualAmount,
    monthlyAmount === null ? null : monthlyAmount * 12,
    currency,
    SAVINGS_VS_MONTHLY,
  );

/** "Renews at ₹499.00/year. Cancel anytime in Settings." */
const buildRenewalNote = (price: PriceDisplay): string | null =>
  price.amount === null
    ? null
    : `Renews at ${price.amount}${price.period}. Cancel anytime in Settings.`;

const buildHeroCopy = (
  annual: PriceDisplay,
  monthly: PriceDisplay,
  trial: TrialOffer | null,
  savings: SavingsNote | null,
  extraFirstYear: string | null,
  monthlyCostsMore: boolean,
  trialConversion: PriceDisplay | null,
): PaywallHeroCopy => ({
  // The price rides in the label so the action states what it charges. Without
  // one there is no figure to promise and the button says only what it does —
  // it is inert in that state anyway. See PurchaseAction.
  ctaLabel:
    annual.amount === null
      ? 'Join Canvas'
      : `Join Canvas for ${annual.amount}${annual.period} →`,
  savings,
  footnote: trial
    ? 'No trial. No waiting. Full access today.'
    : 'Full access today. Cancel anytime.',
  monthlyNote: monthlyCostsMore
    ? 'Flexible option. Higher cost over time than annual.'
    : 'Flexible option. Cancel anytime.',
  // Names the cost of trying first only when the store priced both sides of it.
  trialNote: !trial
    ? null
    : extraFirstYear
    ? `Great if you want to try first, but you'll pay ${extraFirstYear} more in the first year.`
    : 'Great if you want to try first before you commit.',
  trialConversionLabel:
    trial && trialConversion?.amount
      ? `Then ${trialConversion.amount}${trialConversion.period}`
      : null,
  renewalNote: {
    monthly: buildRenewalNote(monthly),
    annual: buildRenewalNote(annual),
  },
});

const buildAppleOffers = (input: PaywallOffersInput): PaywallOffers => {
  const products = input.appleCatalogue?.products;
  const monthlyProduct = products?.find(
    product => product.sku === APPLE_SKU_MONTHLY,
  );
  const annualProduct = products?.find(
    product => product.sku === APPLE_SKU_ANNUAL,
  );
  const trialProduct = products?.find(
    product => product.sku === APPLE_SKU_ANNUAL_TRIAL,
  );

  const monthly = toStorePrice(monthlyProduct, '/month');
  const annual = toStorePrice(annualProduct, '/year');
  // No DB fallback: the trial card's whole job is to state what the free days
  // convert to, and without the store's price there is no figure to state.
  const trialPrice = trialProduct
    ? { currency: null, amount: trialProduct.displayPrice, period: '/year' }
    : null;

  const monthlyAmount = monthlyProduct?.price ?? null;
  const annualAmount = annualProduct?.price ?? null;
  const hasStoreAmounts = monthlyAmount !== null && annualAmount !== null;

  const trial = buildAppleTrialCard(
    trialProduct,
    !!input.appleCatalogue?.introOfferEligible,
    trialPrice,
  );

  // Only counts while a trial card is actually rendered. The product can be in
  // the catalogue with this Apple ID no longer eligible for its offer, and a
  // comparison against a card nobody can see explains nothing.
  const trialConversionAmount = trial ? trialProduct?.price ?? null : null;
  const savings = buildAnnualSavings(
    annualAmount,
    monthlyAmount,
    trialConversionAmount,
    annualProduct?.currency,
  );
  // The same gap the hero advertises, stated from the trial card's side. Read
  // off the note rather than recomputed so the two can never disagree.
  const extraFirstYear =
    savings && savings.body === SAVINGS_VS_TRIAL
      ? savings.headline.replace('Save ', '')
      : null;

  const pricesUnavailable =
    monthly.amount === null ||
    annual.amount === null ||
    (!input.appleCatalogue &&
      (!!input.appleCatalogueLoading || !!input.appleCatalogueError));

  if (pricesUnavailable) {
    console.log('[paywall] Apple store prices missing', {
      skus: products?.map(product => product.sku) ?? null,
      monthly: monthly.amount,
      annual: annual.amount,
      catalogueLoading: !!input.appleCatalogueLoading,
      catalogueError: !!input.appleCatalogueError,
    });
  }

  return {
    // A card the store did not price cannot be sold, whether its product is
    // missing from an otherwise good catalogue or the catalogue itself never
    // arrived. See PaywallOffersInput on why the query's own state is taken
    // rather than inferred, and why it is ignored once a catalogue has landed.
    pricesUnavailable,
    monthly,
    annual,
    // Both lines are percentages OF a price. With no store figure to divide
    // there is nothing to state, and stating one anyway would be arithmetic
    // against a number this rail never charges.
    annualPerMonthLabel: annualProduct?.price
      ? readPerMonthLabel(annualProduct.price, annualProduct.currency)
      : null,
    savingsPercent: hasStoreAmounts
      ? readSavingsPercent(monthlyAmount, annualAmount)
      : null,
    trial,
    // The hero states the gap as money saved rather than as a struck price: the
    // trial is a card of its own on this layout, so the figure it converts at is
    // already printed a few points below and does not need striking here too.
    annualStrikePrice: null,
    // Both App Store products are always on offer, and the trial-consumed notice
    // is a Razorpay-rail answer: `trialEligible` is false for every iOS caller,
    // and Apple's own introOfferEligible cannot tell "spent it" from "there was
    // never an offer here". Deriving the notice from either would accuse an
    // Apple user of using a trial they never had.
    offered: { monthly: true, annual: true },
    trialConsumedNotice: null,
    heroCopy: buildHeroCopy(
      annual,
      monthly,
      trial,
      savings,
      extraFirstYear,
      hasStoreAmounts && monthlyAmount * 12 > annualAmount,
      trialPrice,
    ),
  };
};

/** The three cards a paywall selection can land on. */
export type PaywallPlanKey = 'trial' | 'monthly' | 'annual';

/**
 * The card the screen should select on the user's behalf, or null to leave the
 * selection where it is.
 *
 * A card's buy button is inert until its card is the selected one, so a
 * selection sitting on a card that cannot be bought is a paywall with no live
 * action anywhere — the user's only way out is to discover that tapping a card
 * body moves the selection. That happens whenever exactly one of the two plans
 * is buyable, and on the Apple rail "buyable" is not the same question as
 * "offered": a product missing from the store catalogue (rejected, still in
 * review, a storefront that never got it) renders its card as an unpriced
 * placeholder with no action at all, while `offered` stays true for both.
 *
 * Null when both are buyable — the default selection is already a real choice —
 * and when neither is, where there is nothing to move the selection to.
 */
export const preselectedPlan = (
  offers: PaywallOffers,
): PaywallPlanKey | null => {
  const monthly = offers.offered.monthly && offers.monthly.amount !== null;
  const annual = offers.offered.annual && offers.annual.amount !== null;

  // The hero layout leads with annual, and every other card's action is inert
  // while it is unselected — landing on the trial there would leave the one
  // button the screen is built around dead until the user found out that
  // tapping a card body moves the selection. Falls through when the store never
  // priced the annual product, which is the case the rest of this handles.
  if (offers.heroCopy && annual) return 'annual';

  if (offers.trial) return 'trial';

  if (monthly === annual) return null;
  return annual ? 'annual' : 'monthly';
};

/** The prices and trial copy the active rail is actually able to honour. */
export const buildPaywallOffers = (input: PaywallOffersInput): PaywallOffers =>
  IS_APPLE_RAIL ? buildAppleOffers(input) : buildRazorpayOffers(input);
