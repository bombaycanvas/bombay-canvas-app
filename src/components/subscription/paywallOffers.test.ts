import type { Plan } from '../../api/planCodes';
import type { AppleCatalogue } from '../../services/iap/appleIap';
import type {
  PaywallOffers,
  PaywallOffersInput,
  PaywallPlanKey,
} from './paywallOffers';

// The Apple cards' per-month line and their free-days "₹0" are built through
// Intl against the DEVICE locale, which is the right argument in production and
// ambient state here: the same call renders "Only $0.42/month" on this machine
// and "Only 0,42 $/month" on a German CI container. The locale is pinned so
// these assertions are about what the builder composes rather than about who
// ran the suite. (That the formatter defers to the device locale at all is
// asserted in money.test.ts.)
const RealNumberFormat = Intl.NumberFormat;

beforeAll(() => {
  // A plain function rather than an arrow: this is called with `new`, and `new`
  // yields the object a constructor returns.
  Intl.NumberFormat = function PinnedNumberFormat(
    locales?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ) {
    return new RealNumberFormat(locales ?? 'en-US', options);
  } as unknown as typeof Intl.NumberFormat;
});

afterAll(() => {
  Intl.NumberFormat = RealNumberFormat;
});

const PLANS: Plan[] = [
  {
    code: 'MONTHLY',
    name: 'Monthly',
    description: '',
    period: 'monthly',
    price: 9900,
    currency: 'INR',
  },
  {
    code: 'ANNUAL',
    name: 'Annual',
    description: '',
    period: 'yearly',
    price: 49900,
    currency: 'INR',
  },
  {
    code: 'TRIAL',
    name: '3-Day Trial',
    description: '',
    period: 'yearly',
    price: 49900,
    currency: 'INR',
    trial: { days: 3, durationMinutes: 3 * 24 * 60, upfrontAmount: 100 },
  },
];

// What a CURRENT app build is offered: both trial codes. The old ₹499 TRIAL is
// still in the list because shipped builds resolve it by name, so the set has to
// carry it — this build must nonetheless sell the ₹899 one.
const PLANS_WITH_BOTH_TRIALS: Plan[] = [
  ...PLANS,
  {
    code: 'TRIAL_NEW',
    name: '3-Day Trial',
    description: '',
    period: 'yearly',
    price: 89900,
    currency: 'INR',
    trial: { days: 3, durationMinutes: 3 * 24 * 60, upfrontAmount: 100 },
  },
];

// GET /plans quotes what a trial converts to even when it is no longer offering
// one, which is the only way the paywall can price a trial the payload has
// already dropped. Paise, matching Plan.price.
const TRIAL_NEW_CONVERSION_PAISE = 89900;

const APPLE_CATALOGUE: AppleCatalogue = {
  introOfferEligible: true,
  products: [
    // The free days ride their OWN product now, and it converts at 899 - not at
    // the 499 annual sitting beside it.
    {
      sku: 'com.bombaycanvas.app1.premium.annual.trial',
      displayPrice: '₹899.00',
      title: '3-Day Free Trial',
      description: '',
      price: 899,
      currency: 'INR',
      introOffer: {
        paymentMode: 'free-trial',
        periods: 3,
        unitLabel: 'day',
        periodLabel: '3 days',
        displayPrice: null,
      },
    },
    {
      sku: 'com.bombaycanvas.app1.premium.monthly',
      displayPrice: '₹99.00',
      title: 'Monthly',
      description: '',
      price: 99,
      currency: 'INR',
      introOffer: null,
    },
    {
      sku: 'com.bombaycanvas.app1.premium.annual',
      displayPrice: '₹499.00',
      title: 'Annual',
      description: '',
      price: 499,
      currency: 'INR',
      // No offer of its own. Apple scopes intro-offer eligibility to the GROUP,
      // so a second offered product would mean whichever the user tapped first
      // silently burned the other's trial.
      introOffer: null,
    },
  ],
};

// The storefront the DB fallback got wrong: every figure here is dollars, and
// nothing in our own tables knows what Apple charges in this territory.
const US_CATALOGUE: AppleCatalogue = {
  introOfferEligible: false,
  products: APPLE_CATALOGUE.products
    .filter(product => !product.sku.endsWith('.annual.trial'))
    .map(product => ({
      ...product,
      displayPrice: product.sku.endsWith('.monthly') ? '$5.99' : '$59.99',
      price: product.sku.endsWith('.monthly') ? 5.99 : 59.99,
      currency: 'USD',
    })),
};

/** The catalogue with a change applied to the free-days product only. */
const withTrialProduct = (
  patch: Partial<AppleCatalogue['products'][number]>,
): AppleCatalogue => ({
  ...APPLE_CATALOGUE,
  products: APPLE_CATALOGUE.products.map(product =>
    product.sku.endsWith('.annual.trial') ? { ...product, ...patch } : product,
  ),
});

// PAYMENT_RAIL is a module constant read from Platform.OS at import time, so the
// rail can only be swapped by re-importing the module under a mocked platform.
const buildOffersOn = (
  os: 'ios' | 'android',
  input: PaywallOffersInput,
): PaywallOffers => {
  let offers: PaywallOffers | null = null;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    offers = require('./paywallOffers').buildPaywallOffers(input);
  });
  return offers as unknown as PaywallOffers;
};

afterEach(() => jest.resetModules());

describe('buildPaywallOffers on the Razorpay rail', () => {
  it('prices from the DB plans and keeps the ₹1 trial card', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS,
    });

    expect(offers.monthly).toEqual({
      currency: '₹',
      amount: '99',
      period: '/month',
    });
    expect(offers.annual).toEqual({
      currency: '₹',
      amount: '499',
      period: '/year',
    });
    expect(offers.trial?.price.amount).toBe('1');
    expect(offers.trial?.title).toBe('3-Day Trial');
    // The DB row IS the charged price here, so there is never an unpriced card
    // on this rail — not even with the plans call still in flight.
    expect(offers.pricesUnavailable).toBe(false);
    expect(buildOffersOn('android', {}).pricesUnavailable).toBe(false);
  });

  it('drops the trial card when no trial plan is offered', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.filter(plan => plan.code !== 'TRIAL'),
    });

    expect(offers.trial).toBeNull();
  });

  // The mis-selling case. Both trial codes are offered to a current build; it
  // must quote the one it will actually be charged on. Reading the post-trial
  // price off the ANNUAL card instead — which is what this did while there was
  // only one trial — shows ₹499 and charges ₹899.
  it('quotes the ₹899 post-trial price when TRIAL_NEW is on offer', () => {
    const offers = buildOffersOn('android', { plans: PLANS_WITH_BOTH_TRIALS });

    expect(offers.trial?.footnote).toContain('then ₹899/year');
    expect(offers.trial?.footnote).not.toContain('₹499/year');
    // The ANNUAL card beside it is still the real ₹499 plan.
    expect(offers.annual.amount).toBe('499');
  });

  // The compatibility half: a client offered only the original TRIAL keeps
  // being quoted ₹499, which is what it will be charged.
  it('quotes ₹499 when only the original TRIAL is on offer', () => {
    const offers = buildOffersOn('android', { plans: PLANS });

    expect(offers.trial?.footnote).toContain('then ₹499/year');
  });

  // Both the upfront charge and the trial length come from the plan, so a
  // backend change to either needs no app release.
  it('reads the upfront amount and trial length from the plan', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.map(plan =>
        plan.code === 'TRIAL'
          ? {
              ...plan,
              trial: {
                days: 7,
                durationMinutes: 7 * 24 * 60,
                upfrontAmount: 500,
              },
            }
          : plan,
      ),
    });

    expect(offers.trial?.price.amount).toBe('5');
    expect(offers.trial?.buttonLabel).toBe('Start for ₹5 →');
    expect(offers.trial?.footnote).toContain('7 days full access');
  });
});

// The annual card's job on a trial paywall is to undercut the trial sitting
// above it. TRIAL_NEW converts at ₹899 while ANNUAL is ₹499 outright, so the
// card strikes the ₹899 and rates itself against that rather than against the
// monthly plan the user is not weighing.
describe('the annual card against a trial that converts higher', () => {
  it('strikes the post-trial price and measures the saving from it', () => {
    const offers = buildOffersOn('android', { plans: PLANS_WITH_BOTH_TRIALS });

    expect(offers.annualStrikePrice).toBe('₹899');
    // 499 off 899, not 499 off twelve ₹99 payments — which would read 58%.
    expect(offers.savingsPercent).toBe(44);
  });

  // Today's original TRIAL converts at exactly the annual price. Striking it
  // would show "₹499 ₹499" and a 0% saving.
  it('strikes nothing when the trial converts at the annual price', () => {
    const offers = buildOffersOn('android', { plans: PLANS });

    expect(offers.annualStrikePrice).toBeNull();
    expect(offers.savingsPercent).toBe(58);
  });

  // The trial-ended paywall is where the gap argues hardest, and it is also the
  // one place the price is missing: /plans drops the trial codes once the trial
  // is spent, so the figure is supplied rather than read.
  it("strikes the server's conversion price once the trial is spent", () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.filter(plan => plan.code !== 'TRIAL'),
      trialEligible: false,
      trialConversionAmount: TRIAL_NEW_CONVERSION_PAISE,
    });

    expect(offers.trial).toBeNull();
    expect(offers.annualStrikePrice).toBe('₹899');
    expect(offers.savingsPercent).toBe(44);
  });

  // No trial card and no verdict on eligibility is not evidence the user spent
  // one, so there is no conversion price to claim.
  it('strikes nothing while eligibility is unknown', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.filter(plan => plan.code !== 'TRIAL'),
      trialConversionAmount: TRIAL_NEW_CONVERSION_PAISE,
    });

    expect(offers.annualStrikePrice).toBeNull();
    expect(offers.savingsPercent).toBe(58);
  });

  // A server that predates the field states no conversion price, so there is
  // nothing to strike and nothing may be invented in its place.
  it('strikes nothing when the server states no conversion price', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.filter(plan => plan.code !== 'TRIAL'),
      trialEligible: false,
    });

    expect(offers.annualStrikePrice).toBeNull();
    expect(offers.savingsPercent).toBe(58);
  });

  // The trial card that is actually rendered wins over the server's figure: its
  // footnote sits directly above the strike, and the two must agree.
  it('prices the strike off the rendered trial card while there is one', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS_WITH_BOTH_TRIALS,
      trialConversionAmount: 250000,
    });

    expect(offers.annualStrikePrice).toBe('₹899');
  });

  // The struck price is a comparison the user can see on the same card, so it
  // carries the badge on its own — unlike the monthly comparison, which needs
  // the monthly card to be there.
  it('still rates the saving when only the trial and annual are offered', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS_WITH_BOTH_TRIALS.filter(plan => plan.code !== 'MONTHLY'),
    });

    expect(offers.offered).toEqual({ monthly: false, annual: true });
    expect(offers.annualStrikePrice).toBe('₹899');
    expect(offers.savingsPercent).toBe(44);
  });
});

// `trialEligible` off GET /plans is the only thing that separates "you spent
// your trial" from "this build has trials switched off" and from "the plans call
// has not landed". The notice is an accusation, so it may only fire on the first.
describe('the trial-consumed notice on the Razorpay rail', () => {
  const PAID_PLANS = PLANS.filter(plan => plan.code !== 'TRIAL');

  it('explains the missing trial once the server reports the user ineligible', () => {
    const offers = buildOffersOn('android', {
      plans: PAID_PLANS,
      trialEligible: false,
      trialConversionAmount: TRIAL_NEW_CONVERSION_PAISE,
    });

    expect(offers.trial).toBeNull();
    expect(offers.trialConsumedNotice?.label).toBe('TRIAL ALREADY USED');
    expect(offers.trialConsumedNotice?.body).toContain('Pick a plan below');
  });

  // An anonymous caller is reported eligible, so a signed-out visitor is never
  // told they burned a trial they never started.
  it('says nothing to a caller the server still considers eligible', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS,
      trialEligible: true,
    });

    expect(offers.trialConsumedNotice).toBeNull();
  });

  // The plans call has not landed, or the server predates the flag. Either way
  // the trial card's absence is not evidence of anything.
  it('says nothing while eligibility is unknown', () => {
    expect(
      buildOffersOn('android', { plans: PAID_PLANS }).trialConsumedNotice,
    ).toBeNull();
    expect(buildOffersOn('android', {}).trialConsumedNotice).toBeNull();
  });

  // Defensive: a trial that is still on offer contradicts the flag, and the card
  // the user can actually tap wins over a notice saying it is gone.
  it('says nothing while a trial is still on offer', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS,
      trialEligible: false,
    });

    expect(offers.trial).not.toBeNull();
    expect(offers.trialConsumedNotice).toBeNull();
  });

  // The banner explains eligibility; the struck price is a bonus on top of it.
  // An API too old to quote a conversion price must cost the screen the strike
  // and nothing else — gating the explanation on it is what silently emptied
  // this paywall once already.
  it('still explains the trial when the server quotes no conversion price', () => {
    const offers = buildOffersOn('android', {
      plans: PAID_PLANS,
      trialEligible: false,
    });

    expect(offers.trialConsumedNotice?.label).toBe('TRIAL ALREADY USED');
    expect(offers.annualStrikePrice).toBeNull();
  });

  it('names the single plan when that is all the rail came back with', () => {
    const offers = buildOffersOn('android', {
      plans: PAID_PLANS.filter(plan => plan.code === 'MONTHLY'),
      trialEligible: false,
      trialConversionAmount: TRIAL_NEW_CONVERSION_PAISE,
    });

    expect(offers.offered).toEqual({ monthly: true, annual: false });
    expect(offers.trialConsumedNotice?.body).toContain(
      'Activate the monthly plan below',
    );
    // Nothing left to be cheaper than, and no annual card to carry the line.
    expect(offers.savingsPercent).toBeNull();
    expect(offers.annualPerMonthLabel).toBeNull();
  });

  // Hiding both cards on an unlanded or malformed plans call would leave a
  // paywall with nothing to buy, so "no list" means "not loaded", not "nothing
  // is offered".
  it('offers both plans while the plans call has not landed', () => {
    expect(buildOffersOn('android', {}).offered).toEqual({
      monthly: true,
      annual: true,
    });
    expect(buildOffersOn('android', { plans: [] }).offered).toEqual({
      monthly: true,
      annual: true,
    });
  });
});

describe('buildPaywallOffers on the Apple rail', () => {
  it("shows the store's own prices and the free days as their own card", () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: APPLE_CATALOGUE,
    });

    expect(offers.monthly).toEqual({
      currency: null,
      amount: '₹99.00',
      period: '/month',
    });
    expect(offers.annual).toEqual({
      currency: null,
      amount: '₹499.00',
      period: '/year',
    });
    expect(offers.trial).toEqual({
      planCode: 'ANNUAL_POST_TRIAL',
      title: '3 Days Free',
      price: { currency: null, amount: '₹0', period: ' today' },
      buttonLabel: 'Start Free Trial →',
      footnote: '3 days free, then ₹899.00/year. Cancel anytime in Settings.',
    });
  });

  // The mis-selling case, Apple's version of the TRIAL/TRIAL_NEW one. The free
  // days convert at 899 on their own product while a 499 annual sits beside
  // them; quoting the neighbour - which is what this did while the offer lived
  // ON the annual product - shows 499 and charges 899.
  it('quotes the trial product own conversion price, not the annual card', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: APPLE_CATALOGUE,
    });

    expect(offers.trial?.footnote).toContain('then ₹899.00/year');
    expect(offers.trial?.footnote).not.toContain('₹499');
    // The ANNUAL card beside it is still the real 499 plan.
    expect(offers.annual.amount).toBe('₹499.00');
  });

  // The card names the code it buys. Re-deriving it with pickTrialPlan found no
  // trial code in the Apple payload at all, which left the card unbuyable.
  it('buys the plan its free-days product actually bills against', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: APPLE_CATALOGUE,
    });

    expect(offers.trial?.planCode).toBe('ANNUAL_POST_TRIAL');
  });

  // The store lists the annual product but not the free-days one - an older
  // build, or a product not yet approved. There is no conversion price to state,
  // so no card rather than one quoting the neighbour's 499.
  it('drops the card when the free-days product is not in the catalogue', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        ...APPLE_CATALOGUE,
        products: APPLE_CATALOGUE.products.filter(
          product => !product.sku.endsWith('.annual.trial'),
        ),
      },
    });

    expect(offers.trial).toBeNull();
    expect(offers.annual.amount).toBe('₹499.00');
  });

  it('names the card after the period Apple actually reports', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: withTrialProduct({
        introOffer: {
          paymentMode: 'free-trial',
          periods: 1,
          unitLabel: 'week',
          periodLabel: '1 week',
          displayPrice: null,
        },
      }),
    });

    expect(offers.trial?.title).toBe('1 Week Free');
    expect(offers.trial?.footnote).toContain('1 week free');
  });

  it('promises no trial when this Apple ID is no longer eligible for the offer', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: { ...APPLE_CATALOGUE, introOfferEligible: false },
    });

    expect(offers.trial).toBeNull();
  });

  // Switching the offer in App Store Connect from free days to a paid intro is a
  // console change with no release behind it, so the card has to follow it. The
  // charge is stated where the "₹0" was and again in the footnote, because it is
  // taken today and is not the price the subscription renews at.
  it('sells a pay-up-front intro at the price the store charges for it', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: withTrialProduct({
        introOffer: {
          paymentMode: 'pay-up-front',
          periods: 3,
          unitLabel: 'day',
          periodLabel: '3 days',
          displayPrice: '₹49.00',
        },
      }),
    });

    expect(offers.trial).toEqual({
      planCode: 'ANNUAL_POST_TRIAL',
      title: '3-Day Trial',
      price: { currency: null, amount: '₹49.00', period: ' today' },
      buttonLabel: 'Start for ₹49.00 →',
      footnote:
        '3 days for ₹49.00, then ₹899.00/year. Cancel anytime in Settings.',
    });
    expect(offers.trial?.footnote).not.toContain('free');
  });

  // Pay-as-you-go charges the intro price EVERY period, so the period has to
  // ride beside the figure: "₹49" alone reads as the whole intro cost when it is
  // actually taken three times.
  it('states the period on a pay-as-you-go intro, which is billed repeatedly', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: withTrialProduct({
        introOffer: {
          paymentMode: 'pay-as-you-go',
          periods: 3,
          unitLabel: 'month',
          periodLabel: '3 months',
          displayPrice: '₹49.00',
        },
      }),
    });

    expect(offers.trial).toEqual({
      planCode: 'ANNUAL_POST_TRIAL',
      title: '3-Month Intro',
      price: { currency: null, amount: '₹49.00', period: '/month' },
      buttonLabel: 'Start for ₹49.00 →',
      footnote:
        '₹49.00/month for 3 months, then ₹899.00/year. Cancel anytime in Settings.',
    });
  });

  // readIntroOffer drops a paid offer the store did not price, so the card never
  // has to invent one. Guarded here too: the only other figure in reach is the
  // full ₹899, and quoting it as the intro charge would overstate what the tap
  // takes by an order of magnitude.
  it('drops the card when a paid intro arrives without a price', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: withTrialProduct({
        introOffer: {
          paymentMode: 'pay-up-front',
          periods: 3,
          unitLabel: 'day',
          periodLabel: '3 days',
          displayPrice: null,
        },
      }),
    });

    expect(offers.trial).toBeNull();
  });

  // Eligibility is per Apple ID and subscription group whatever the offer
  // charges, so a paid intro is subject to exactly the same check.
  it('promises no paid intro either once this Apple ID has spent the offer', () => {
    const offers = buildOffersOn('ios', {
      ...{ plans: PLANS },
      appleCatalogue: {
        ...withTrialProduct({
          introOffer: {
            paymentMode: 'pay-up-front',
            periods: 3,
            unitLabel: 'day',
            periodLabel: '3 days',
            displayPrice: '₹49.00',
          },
        }),
        introOfferEligible: false,
      },
    });

    expect(offers.trial).toBeNull();
  });

  it('says "Free" rather than a wrong figure when the currency cannot be formatted', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: withTrialProduct({ currency: 'not-a-currency' }),
    });

    expect(offers.trial?.price).toEqual({
      currency: null,
      amount: 'Free',
      period: ' today',
    });
  });

  // This used to fall back to the DB's ₹499. That row is an INR accounting
  // figure; a US buyer reading it saw a price the App Store was never going to
  // charge them, and the card swapped under them once StoreKit answered. There
  // is no honest stand-in for a storefront price, so the cards say nothing.
  it('quotes no price at all while the store call is still in flight', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogueLoading: true,
    });

    expect(offers.pricesUnavailable).toBe(true);
    expect(offers.monthly).toEqual({
      currency: null,
      amount: null,
      period: '/month',
    });
    expect(offers.annual).toEqual({
      currency: null,
      amount: null,
      period: '/year',
    });
    expect(offers.savingsPercent).toBeNull();
    expect(offers.annualPerMonthLabel).toBeNull();
    expect(offers.trial).toBeNull();
    // The DB rupee figures must not survive anywhere on the sheet — not in a
    // price, not in a footnote, not in a struck comparison.
    expect(JSON.stringify(offers)).not.toContain('₹');
    // Same answer with no query state supplied at all: an absent catalogue is
    // the whole reason there is no price, and the flags only say why.
    const withoutQueryState = buildOffersOn('ios', { plans: PLANS });
    expect(withoutQueryState.pricesUnavailable).toBe(true);
    expect(JSON.stringify(withoutQueryState)).not.toContain('₹');
  });

  // A store that answered and refused is the same answer as one still trying,
  // as far as what may be shown: neither produced a price.
  it('quotes no price when the store call failed outright', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogueError: true,
    });

    expect(offers.pricesUnavailable).toBe(true);
    expect(JSON.stringify(offers)).not.toContain('₹');
  });

  it('prices a US storefront from the store and nothing else', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: US_CATALOGUE,
    });

    expect(offers.pricesUnavailable).toBe(false);
    expect(offers.monthly).toEqual({
      currency: null,
      amount: '$5.99',
      period: '/month',
    });
    expect(offers.annual).toEqual({
      currency: null,
      amount: '$59.99',
      period: '/year',
    });
    expect(JSON.stringify(offers)).not.toContain('₹');
  });

  // The half-catalogue case: one product approved, the other not. The annual
  // card must not borrow the ₹499 the DB happens to hold for it, and a saving
  // measured from a price we do not have would be arithmetic on a guess.
  it('leaves the annual card unpriced when only the monthly product exists', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        introOfferEligible: false,
        products: APPLE_CATALOGUE.products.filter(
          product => product.sku === 'com.bombaycanvas.app1.premium.monthly',
        ),
      },
    });

    expect(offers.monthly.amount).toBe('₹99.00');
    expect(offers.annual.amount).toBeNull();
    expect(offers.pricesUnavailable).toBe(true);
    expect(offers.savingsPercent).toBeNull();
    expect(offers.annualPerMonthLabel).toBeNull();
  });

  // The backend sends trialEligible:false to EVERY iOS caller, because the ₹1
  // plan is not sold there. Letting that reach the notice would tell an Apple
  // user they had used a trial they never had.
  // Apple's free days ride on the annual product, so what the trial converts at
  // IS the annual price. There is no second figure to strike.
  it('never strikes a post-trial price', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS_WITH_BOTH_TRIALS,
      appleCatalogue: APPLE_CATALOGUE,
    });

    expect(offers.annualStrikePrice).toBeNull();
  });

  it('never shows the trial-consumed notice, whatever the backend reports', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: { ...APPLE_CATALOGUE, introOfferEligible: false },
      trialEligible: false,
    });

    expect(offers.trialConsumedNotice).toBeNull();
    expect(offers.offered).toEqual({ monthly: true, annual: true });
  });

  it('keeps the decimals on a per-month figure too small to survive rounding', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        introOfferEligible: false,
        products: APPLE_CATALOGUE.products.map(product => ({
          ...product,
          displayPrice: product.sku.endsWith('annual') ? '$4.99' : '$0.99',
          price: product.sku.endsWith('annual') ? 4.99 : 0.99,
          currency: 'USD',
        })),
      },
    });

    expect(offers.annualPerMonthLabel).toBe('Only $0.42/month');
  });
});

// A card's buy button is inert until its card is the selected one, so the
// preselection decides whether the paywall has a live action on it at all.
describe('preselectedPlan', () => {
  const PAID_PLANS = PLANS.filter(plan => plan.code !== 'TRIAL');

  const preselectOn = (
    os: 'ios' | 'android',
    input: PaywallOffersInput,
  ): PaywallPlanKey | null => {
    let key: PaywallPlanKey | null = null;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: os } }));
      const paywall = require('./paywallOffers');
      key = paywall.preselectedPlan(paywall.buildPaywallOffers(input));
    });
    return key;
  };

  it('takes the trial card whenever the rail is offering one', () => {
    expect(
      preselectOn('ios', {
        plans: PLANS_WITH_BOTH_TRIALS,
        appleCatalogue: APPLE_CATALOGUE,
      }),
    ).toBe('trial');
    expect(preselectOn('android', { plans: PLANS_WITH_BOTH_TRIALS })).toBe(
      'trial',
    );
  });

  it('leaves a working two-card paywall on its default selection', () => {
    expect(
      preselectOn('ios', { plans: PLANS, appleCatalogue: US_CATALOGUE }),
    ).toBeNull();
    expect(preselectOn('android', { plans: PAID_PLANS })).toBeNull();
  });

  it('moves to the only plan the rail offers', () => {
    expect(
      preselectOn('android', {
        plans: PAID_PLANS.filter(plan => plan.code === 'MONTHLY'),
      }),
    ).toBe('monthly');
    expect(
      preselectOn('android', {
        plans: PAID_PLANS.filter(plan => plan.code === 'ANNUAL'),
      }),
    ).toBe('annual');
  });

  // The regression this function was extracted for. On Apple both cards stay
  // "offered" while one of them is unpriced, so a preselection that read only
  // `offered` left the default selection on a card whose action is an inert
  // View — with the one buyable card's button disabled for being unselected,
  // and no live purchase button anywhere on the screen.
  it('moves off a card the store could not price', () => {
    const monthlyOnly = {
      introOfferEligible: false,
      products: APPLE_CATALOGUE.products.filter(
        product => product.sku === 'com.bombaycanvas.app1.premium.monthly',
      ),
    };

    expect(
      preselectOn('ios', { plans: PLANS, appleCatalogue: monthlyOnly }),
    ).toBe('monthly');
    expect(
      preselectOn('ios', {
        plans: PLANS,
        appleCatalogue: {
          introOfferEligible: false,
          products: APPLE_CATALOGUE.products.filter(
            product => product.sku === 'com.bombaycanvas.app1.premium.annual',
          ),
        },
      }),
    ).toBe('annual');
  });

  // Nothing to move to. The screen keeps whatever it had rather than shuffling
  // the highlight around two cards that are equally unbuyable.
  it('stays put when the catalogue never arrived', () => {
    expect(preselectOn('ios', { plans: PLANS })).toBeNull();
  });
});
