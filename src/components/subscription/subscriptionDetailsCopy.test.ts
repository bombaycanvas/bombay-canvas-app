import { planCopy, readStorePrice } from './subscriptionDetailsCopy';
import type { SubscriptionPriceFacts } from './subscriptionDetailsCopy';
import type { AppleProduct } from '../../services/iap/appleIap';
import { APPLE_SKU_ANNUAL_TRIAL, APPLE_SKU_MONTHLY } from '../../config/iap';

// The bug this file exists to keep fixed: the Settings card printed a hardcoded
// ₹ against `amountSnapshot`, so a US App Store subscriber paying $59.99 was
// shown "Annual ₹499/yr" — the right number in the wrong currency, on the one
// screen that is supposed to tell them what they pay.
const RUPEE = '₹';

// planCopy formats money through Intl against the DEVICE locale, which is the
// right argument in production and ambient state in a test: the same call
// renders "₹499" here and "499 ₹" on a German CI container, so an exact-string
// assertion would be an assertion about who ran the suite. The locale is pinned
// so these tests are about what planCopy composes; that it defers to the device
// locale at all is money.test.ts's assertion, not this file's.
const RealNumberFormat = Intl.NumberFormat;

beforeAll(() => {
  // A plain function rather than an arrow: money.ts calls this with `new`, and
  // `new` yields the object a constructor returns.
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

const RAZORPAY_ANNUAL: SubscriptionPriceFacts = {
  planCode: 'ANNUAL',
  amountSnapshot: 49900,
};

// The Apple rail leaves amountSnapshot at the INR plan amount on purpose — it is
// the accounting record — and states the storefront price separately.
const APPLE_ANNUAL: SubscriptionPriceFacts = {
  planCode: 'ANNUAL',
  amountSnapshot: 49900,
  displayAmount: 599,
  displayCurrency: 'USD',
};

describe('planCopy on the Razorpay rail', () => {
  // Whole rupees, and the whole string: this line is what the card read before
  // any of this work and has to keep reading, because the paywall that sold the
  // plan quotes "₹499" for it too.
  it('prices an annual subscription in rupees off amountSnapshot', () => {
    expect(planCopy(RAZORPAY_ANNUAL)).toBe('Annual ₹499/yr');
  });

  it('says month, not yr, for a monthly subscription', () => {
    expect(planCopy({ planCode: 'MONTHLY', amountSnapshot: 9900 })).toBe(
      'Monthly ₹99/month',
    );
  });

  // The ₹1 mandate is a real charge on this rail and has to be disclosed, and
  // the post-trial price is the row's own — a TRIAL_NEW subscriber converts at
  // ₹899, not at the ₹499 the old hardcoded table claimed.
  it('discloses the ₹1 activation fee and the price it converts at', () => {
    const copy = planCopy({
      planCode: 'TRIAL_NEW',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 100,
    });

    expect(copy).toBe('Trial ₹1 then ₹899/yr');
  });

  it('drops the "today" clause when the server states no upfront amount', () => {
    const copy = planCopy({
      planCode: 'TRIAL',
      amountSnapshot: 49900,
      isTrial: true,
      upfrontAmount: null,
    });

    expect(copy).toContain('Trial, then');
    expect(copy).toContain(`${RUPEE}499`);
    expect(copy).not.toContain('today');
  });

  // The provider is what tells an unpriced storefront row apart from a rupee
  // one, so a row that names Razorpay must still resolve to the INR record.
  it('keeps the rupee record on a row that names its provider', () => {
    expect(planCopy({ ...RAZORPAY_ANNUAL, provider: 'RAZORPAY' })).toBe(
      'Annual ₹499/yr',
    );
  });

  it('falls back to a generic name for a plan code this build predates', () => {
    const copy = planCopy({
      planCode: 'SOMETHING_NEW' as SubscriptionPriceFacts['planCode'],
      amountSnapshot: 49900,
    });

    expect(copy).toContain('Premium plan');
  });
});

describe('planCopy on the Apple rail', () => {
  it('quotes the storefront price and never the rupee accounting figure', () => {
    const copy = planCopy(APPLE_ANNUAL);

    expect(copy).toContain('$5.99');
    expect(copy).not.toContain(RUPEE);
    expect(copy).not.toContain('499');
  });

  // A yen amount is stored whole: 1200 means ¥1,200. The /100 this replaced
  // would have quoted the subscription at ¥12.
  it('does not divide a zero-exponent currency by a hundred', () => {
    const copy = planCopy({
      planCode: 'ANNUAL',
      amountSnapshot: 49900,
      displayAmount: 1200,
      displayCurrency: 'JPY',
    });

    expect(copy).toBe('Annual ¥1,200/yr');
    expect(copy).not.toMatch(/\b12\b/);
  });

  // A FREE introductory offer has no activation fee to disclose, so the server
  // sends none. "$0.00 today" would read as a charge rather than its absence.
  it('never prints a zero activation fee for a free trial', () => {
    const copy = planCopy({
      planCode: 'ANNUAL_POST_TRIAL',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 0,
      displayAmount: 5999,
      displayCurrency: 'USD',
    });

    expect(copy).toBe('Annual, then $59.99/yr');
    expect(copy).not.toContain('0.00');
    expect(copy).not.toContain(RUPEE);
  });

  // A PAID introductory offer. Apple sells the intro period in three payment
  // modes and the mode is switched in App Store Connect without a build, so the
  // card states whatever was actually charged — the same branch that prints
  // Razorpay's ₹1, reached with Apple's number.
  it('prints what a paid Apple introductory offer charged', () => {
    const copy = planCopy({
      planCode: 'ANNUAL_POST_TRIAL',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 2900,
      displayAmount: 89900,
      displayCurrency: 'INR',
    });

    expect(copy).toBe(`Annual ${RUPEE}29 then ${RUPEE}899/yr`);
  });

  // Apple files its free days under the yearly plan code, so a code-based trial
  // test sees a plain annual subscriber and states the post-trial price as if it
  // were already being charged.
  it('still says "then" while an Apple trial is running', () => {
    const copy = planCopy({
      planCode: 'ANNUAL_POST_TRIAL',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 0,
      displayAmount: 89900,
      displayCurrency: 'INR',
    });

    expect(copy).toContain('then');
  });

  // Apple's free-trial transaction quotes a price of ZERO, and the row is seeded
  // from it, so `displayAmount: 0` is the state every Apple trial subscriber is
  // in until their first paid renewal restates the price. Zero is not what this
  // subscription costs a year — it is the absence of a figure — and `!= null`
  // let it through as one, putting "then $0.00/yr" on the card for the whole
  // trial window.
  it('never quotes a zero display amount as the recurring price', () => {
    const copy = planCopy({
      planCode: 'ANNUAL_POST_TRIAL',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 0,
      displayAmount: 0,
      displayCurrency: 'USD',
      provider: 'APPLE',
    });

    expect(copy).toBe('Annual, then —/yr');
    expect(copy).not.toContain('0');
  });

  // And it does not reach past the missing figure for the rupee one. The whole
  // point of the display pair is that 89900 is an accounting record and not what
  // this account is charged, so quoting it here would be the original bug
  // wearing a fallback.
  it('shows no price at all rather than the rupee record on a storefront row', () => {
    const unpriced: SubscriptionPriceFacts = {
      planCode: 'ANNUAL_POST_TRIAL',
      amountSnapshot: 89900,
      isTrial: true,
      upfrontAmount: 0,
      provider: 'APPLE',
    };

    expect(planCopy(unpriced)).toBe('Annual, then —/yr');
    expect(planCopy({ ...unpriced, isTrial: false })).toBe('Annual —/yr');
    expect(planCopy(unpriced)).not.toContain(RUPEE);
    expect(planCopy(unpriced)).not.toContain('899');
  });

  // Half a display pair is not a price. A row carrying an amount with no
  // currency — an older server, a partially applied write — must fall back to
  // the INR record rather than label the figure with whatever is at hand.
  it('needs both display fields before it leaves the INR record', () => {
    expect(planCopy({ ...RAZORPAY_ANNUAL, displayAmount: 599 })).toContain(
      RUPEE,
    );
    expect(planCopy({ ...RAZORPAY_ANNUAL, displayCurrency: 'USD' })).toContain(
      RUPEE,
    );
  });
});

// The catalogue leg. StoreKit hands back `displayPrice` already formatted for
// the subscriber's storefront, so these strings are fixtures rather than
// anything Intl produces — the pinned locale above does not reach them, and
// must not, because a Japanese subscriber's card should read "¥8,900" whatever
// locale the device UI is in.
describe('planCopy against the App Store catalogue', () => {
  const product = (sku: string, displayPrice: string): AppleProduct => ({
    sku,
    displayPrice,
    title: 'Canvas Premium',
    description: 'Canvas Premium',
    price: null,
    currency: 'USD',
    introOffer: null,
  });

  // The row every Apple subscriber sits on for the three days they are deciding
  // whether to keep the subscription: no recorded pair, because the only
  // transaction Apple has signed for them quotes zero. The em-dash it rendered
  // was honest and useless on the one screen that answers "what am I about to
  // be charged?".
  const APPLE_TRIAL: SubscriptionPriceFacts = {
    planCode: 'ANNUAL_POST_TRIAL',
    amountSnapshot: 89900,
    isTrial: true,
    upfrontAmount: 0,
    provider: 'APPLE',
  };

  it('fills an unpriced trial row from the store price', () => {
    const copy = planCopy(APPLE_TRIAL, [
      product(APPLE_SKU_ANNUAL_TRIAL, '$59.99'),
    ]);

    expect(copy).toBe('Annual, then $59.99/yr');
    expect(copy).not.toContain(RUPEE);
    expect(copy).not.toContain('0.00');
  });

  it('keeps the placeholder when there is no catalogue to ask', () => {
    expect(planCopy(APPLE_TRIAL, undefined)).toBe('Annual, then —/yr');
    expect(planCopy(APPLE_TRIAL, null)).toBe('Annual, then —/yr');
    expect(planCopy(APPLE_TRIAL)).not.toContain(RUPEE);
  });

  // A catalogue that loaded but does not carry this row's product is not a
  // reason to quote a different product's price at the subscriber.
  it("keeps the placeholder when the catalogue lacks this row's product", () => {
    const copy = planCopy(APPLE_TRIAL, [product(APPLE_SKU_MONTHLY, '$9.99')]);

    expect(copy).toBe('Annual, then —/yr');
    expect(copy).not.toContain('9.99');
  });

  // The grandfathering guarantee. The recorded pair is what Apple charged THIS
  // subscriber; the catalogue is what a new buyer would pay today. The day the
  // product's price tier moves, those differ, and the card owes the subscriber
  // their own price.
  it('never lets the catalogue override a recorded display pair', () => {
    const copy = planCopy(
      {
        planCode: 'ANNUAL_POST_TRIAL',
        amountSnapshot: 89900,
        displayAmount: 5999,
        displayCurrency: 'USD',
        provider: 'APPLE',
      },
      [product(APPLE_SKU_ANNUAL_TRIAL, '$79.99')],
    );

    expect(copy).toContain('$59.99');
    expect(copy).not.toContain('79.99');
  });

  // A converted subscriber, not a trial. Their pair predates the display
  // columns, and today's catalogue is a new buyer's price rather than theirs —
  // Apple keeps them on the tier they bought at. The placeholder holds until
  // their next renewal records what they are actually charged.
  it('keeps the placeholder for a converted row the catalogue could price', () => {
    const copy = planCopy(
      {
        planCode: 'ANNUAL_POST_TRIAL',
        amountSnapshot: 89900,
        isTrial: false,
        provider: 'APPLE',
      },
      [product(APPLE_SKU_ANNUAL_TRIAL, '$79.99')],
    );

    expect(copy).toBe('Annual —/yr');
    expect(copy).not.toContain('79.99');
  });

  // A product whose displayPrice came back empty is not a price. `??` would
  // have let '' through and printed a period with no figure in front of it.
  it('keeps the placeholder when the store quotes an empty price', () => {
    expect(planCopy(APPLE_TRIAL, [product(APPLE_SKU_ANNUAL_TRIAL, '')])).toBe(
      'Annual, then —/yr',
    );
  });

  // Through APPLE_SKU_BY_PLAN_CODE, not a hardcoded annual SKU. Exercised on
  // readStorePrice directly: Apple sells the free days on the annual product
  // only, so there is no monthly trial row to reach this through planCopy —
  // the mapping is general so that adding one later needs no change here.
  it('resolves a plan code through its own product, not the annual one', () => {
    const catalogue = [
      product(APPLE_SKU_ANNUAL_TRIAL, '$59.99'),
      product(APPLE_SKU_MONTHLY, '$9.99'),
    ];

    expect(readStorePrice('MONTHLY', catalogue)).toBe('$9.99');
    expect(readStorePrice('ANNUAL_POST_TRIAL', catalogue)).toBe('$59.99');
  });

  // Razorpay-only codes have no Apple product, so the lookup must miss cleanly
  // rather than index into undefined.
  it('returns null for a plan code Apple never sold', () => {
    expect(
      readStorePrice('TRIAL_NEW', [product(APPLE_SKU_MONTHLY, '$9.99')]),
    ).toBe(null);
  });

  // The Razorpay rail never consults the catalogue: readPrice resolves a pair
  // there, so a stray Apple product cannot reach the copy even if the query
  // somehow ran.
  it('leaves the rupee rail alone when a catalogue is present', () => {
    expect(
      planCopy(RAZORPAY_ANNUAL, [product(APPLE_SKU_ANNUAL_TRIAL, '$59.99')]),
    ).toBe('Annual ₹499/yr');
  });
});
