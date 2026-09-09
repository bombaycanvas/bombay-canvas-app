import { resolveConversionValue } from './checkoutConversion';
import type { Plan } from '../../api/planCodes';
import type { AppleProduct } from '../../services/iap/appleIap';

// The bug this file exists to keep fixed: every checkout was reported to Meta in
// rupees off our own tables, so a US App Store buyer charged $59.99 arrived as a
// ₹499 conversion — and when the plans call had not landed, as a hardcoded 499
// or 99 that nothing had ever charged anyone.
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
    code: 'TRIAL_NEW',
    name: '3-Day Trial',
    description: '',
    period: 'yearly',
    price: 89900,
    currency: 'INR',
    trial: { days: 3, durationMinutes: 3 * 24 * 60, upfrontAmount: 100 },
  },
];

// StoreKit quotes `price` in major units already — 59.99 dollars, not 5999
// cents and not the 59990000 milliunits the server-side payload carries.
const US_PRODUCTS: AppleProduct[] = [
  {
    sku: 'com.bombaycanvas.app1.premium.annual',
    displayPrice: '$59.99',
    title: 'Annual',
    description: '',
    price: 59.99,
    currency: 'USD',
    introOffer: null,
  },
  {
    sku: 'com.bombaycanvas.app1.premium.monthly',
    displayPrice: '$5.99',
    title: 'Monthly',
    description: '',
    price: 5.99,
    currency: 'USD',
    introOffer: null,
  },
];

describe('resolveConversionValue on the Apple rail', () => {
  it('reports the storefront price and currency for the annual product', () => {
    expect(
      resolveConversionValue({
        planCode: 'ANNUAL',
        plans: PLANS,
        appleProducts: US_PRODUCTS,
        isAppleRail: true,
      }),
    ).toEqual({ value: 59.99, currency: 'USD' });
  });

  it('reports the storefront price and currency for the monthly product', () => {
    expect(
      resolveConversionValue({
        planCode: 'MONTHLY',
        plans: PLANS,
        appleProducts: US_PRODUCTS,
        isAppleRail: true,
      }),
    ).toEqual({ value: 5.99, currency: 'USD' });
  });

  // The whole point of the change: our own tables know 49900 paise, and quoting
  // it here would report a rupee figure for a dollar charge.
  it('never falls back to the DB price when the catalogue is empty', () => {
    const conversion = resolveConversionValue({
      planCode: 'ANNUAL',
      plans: PLANS,
      appleProducts: [],
      isAppleRail: true,
    });

    expect(conversion.value).toBeUndefined();
    expect(conversion.value).not.toBe(499);
    expect(conversion.value).not.toBe(99);
  });

  it('omits the value when the catalogue never arrived', () => {
    expect(
      resolveConversionValue({
        planCode: 'MONTHLY',
        plans: PLANS,
        appleProducts: null,
        isAppleRail: true,
      }).value,
    ).toBeUndefined();
  });

  // A partial catalogue is the case the 499 fallback got most wrong: the annual
  // product is absent, but the storefront it would have been priced in is not a
  // mystery — the monthly product beside it names the same currency.
  it('takes the storefront currency from a sibling product when its own is missing', () => {
    const conversion = resolveConversionValue({
      planCode: 'ANNUAL',
      plans: PLANS,
      appleProducts: US_PRODUCTS.filter(product =>
        product.sku.endsWith('.monthly'),
      ),
      isAppleRail: true,
    });

    expect(conversion.value).toBeUndefined();
    expect(conversion.currency).toBe('USD');
  });

  // A product Apple listed without a numeric price still has a display string,
  // which is enough to render a card and not enough to report a conversion.
  it('omits the value when the product carries no numeric price', () => {
    expect(
      resolveConversionValue({
        planCode: 'ANNUAL',
        plans: PLANS,
        appleProducts: US_PRODUCTS.map(product => ({ ...product, price: null })),
        isAppleRail: true,
      }).value,
    ).toBeUndefined();
  });

  it('reports no value for a trial code', () => {
    expect(
      resolveConversionValue({
        planCode: 'TRIAL_NEW',
        plans: PLANS,
        appleProducts: US_PRODUCTS,
        isAppleRail: true,
      }).value,
    ).toBeUndefined();
  });
});

describe('resolveConversionValue on the Razorpay rail', () => {
  it('converts the plan price from paise to rupees', () => {
    expect(
      resolveConversionValue({
        planCode: 'ANNUAL',
        plans: PLANS,
        isAppleRail: false,
      }),
    ).toEqual({ value: 499, currency: 'INR' });
  });

  it('prices the monthly plan off its own row', () => {
    expect(
      resolveConversionValue({
        planCode: 'MONTHLY',
        plans: PLANS,
        isAppleRail: false,
      }),
    ).toEqual({ value: 99, currency: 'INR' });
  });

  // Same rule as on Apple: with the plans call still in flight there is no
  // charged amount to report, and 499 was only ever a guess that happened to
  // be right for one plan in one country.
  it('omits the value when the plans call has not landed', () => {
    const conversion = resolveConversionValue({
      planCode: 'ANNUAL',
      plans: undefined,
      isAppleRail: false,
    });

    expect(conversion.value).toBeUndefined();
    expect(conversion.currency).toBe('INR');
  });

  it('omits the value when the code is not in the offered set', () => {
    expect(
      resolveConversionValue({
        planCode: 'ANNUAL_POST_TRIAL',
        plans: PLANS,
        isAppleRail: false,
      }).value,
    ).toBeUndefined();
  });

  it('reports no value for either trial code', () => {
    for (const planCode of ['TRIAL', 'TRIAL_NEW'] as const) {
      expect(
        resolveConversionValue({ planCode, plans: PLANS, isAppleRail: false })
          .value,
      ).toBeUndefined();
    }
  });
});
