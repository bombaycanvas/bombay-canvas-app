import type { Plan } from '../../api/subscription';
import type { AppleCatalogue } from '../../services/iap/appleIap';
import type { PaywallOffers, PaywallOffersInput } from './paywallOffers';

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
  },
];

const APPLE_CATALOGUE: AppleCatalogue = {
  introOfferEligible: true,
  products: [
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
      introOffer: { periodLabel: '3 days', isFree: true, displayPrice: null },
    },
  ],
};

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
      trialEligible: true,
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
  });

  it('drops the trial card when the account is not eligible and no trial plan is offered', () => {
    const offers = buildOffersOn('android', {
      plans: PLANS.filter(plan => plan.code !== 'TRIAL'),
      trialEligible: false,
    });

    expect(offers.trial).toBeNull();
  });
});

describe('buildPaywallOffers on the Apple rail', () => {
  it("shows the store's own prices and the free days as their own card", () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      trialEligible: true,
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
      title: '3 Days Free',
      price: { currency: null, amount: '₹0', period: ' today' },
      buttonLabel: 'Start Free Trial →',
      footnote: '3 days free, then ₹499.00/year. Cancel anytime in Settings.',
    });
  });

  it('names the card after the period Apple actually reports', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        ...APPLE_CATALOGUE,
        products: APPLE_CATALOGUE.products.map(product =>
          product.introOffer
            ? {
                ...product,
                introOffer: { ...product.introOffer, periodLabel: '1 week' },
              }
            : product,
        ),
      },
    });

    expect(offers.trial?.title).toBe('1 Week Free');
    expect(offers.trial?.footnote).toContain('1 week free');
  });

  it('promises no trial when this Apple ID is no longer eligible for the offer', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      trialEligible: true,
      appleCatalogue: { ...APPLE_CATALOGUE, introOfferEligible: false },
    });

    expect(offers.trial).toBeNull();
  });

  it('promises no trial when the offer is a discount rather than free days', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        ...APPLE_CATALOGUE,
        products: APPLE_CATALOGUE.products.map(product =>
          product.introOffer
            ? {
                ...product,
                introOffer: { ...product.introOffer, isFree: false },
              }
            : product,
        ),
      },
    });

    expect(offers.trial).toBeNull();
  });

  it('says "Free" rather than a wrong figure when the currency cannot be formatted', () => {
    const offers = buildOffersOn('ios', {
      plans: PLANS,
      appleCatalogue: {
        ...APPLE_CATALOGUE,
        products: APPLE_CATALOGUE.products.map(product => ({
          ...product,
          currency: 'not-a-currency',
        })),
      },
    });

    expect(offers.trial?.price).toEqual({
      currency: null,
      amount: 'Free',
      period: ' today',
    });
  });

  it('falls back to the DB price while the store call is still in flight', () => {
    const offers = buildOffersOn('ios', { plans: PLANS, trialEligible: true });

    expect(offers.annual).toEqual({
      currency: '₹',
      amount: '499',
      period: '/year',
    });
    expect(offers.savingsPercent).toBeNull();
    expect(offers.trial).toBeNull();
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
