import { currencyExponent, formatMinorUnits } from './money';

// The whole reason this helper exists: BillingHistoryList and the details card
// both divided minor units by 100, which is only correct for the ~30 of Apple's
// ~40 storefront currencies that happen to have two decimal places.
//
// Every rendering below is asserted against a PINNED locale. formatMinorUnits
// deliberately formats against the device's own locale, which is right in
// production and is ambient state in a test: the same call renders "$5.99" on
// this machine, "5,99 $" on a German one and "٥٫٩٩ US$" on an Arabic one, so an
// assertion about the output would really be an assertion about who ran it — a
// suite green by accident of environment here and red for the next teammate.
// Pinning moves that variable out of the way; the one property it would
// otherwise hide — that the module asks for the device locale at all — is
// asserted directly, further down.
const RealNumberFormat = Intl.NumberFormat;

const pinLocale = (locale: string) => {
  // A plain function rather than an arrow: money.ts calls this with `new`, and
  // `new` yields the object a constructor returns.
  Intl.NumberFormat = function PinnedNumberFormat(
    locales?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ) {
    return new RealNumberFormat(locales ?? locale, options);
  } as unknown as typeof Intl.NumberFormat;
};

beforeAll(() => pinLocale('en-US'));
afterAll(() => {
  Intl.NumberFormat = RealNumberFormat;
});

describe('currencyExponent', () => {
  it('knows the exponents that break a hardcoded /100', () => {
    expect(currencyExponent('INR')).toBe(2);
    expect(currencyExponent('USD')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KRW')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    expect(currencyExponent('BHD')).toBe(3);
  });

  it('assumes two places for a code Intl refuses', () => {
    expect(currencyExponent('not-a-currency')).toBe(2);
  });
});

describe('formatMinorUnits', () => {
  it('renders Razorpay rupees the way the details card always has', () => {
    expect(formatMinorUnits(49900, 'INR')).toBe('₹499');
  });

  // A yen price is stored whole: 1200 means ¥1,200. The old /100 turned an
  // eleven-dollar subscription into a twelve-yen one.
  it('does not divide a zero-exponent currency', () => {
    const formatted = formatMinorUnits(1200, 'JPY');

    expect(formatted).toBe('¥1,200');
    expect(formatted).not.toMatch(/\b12\b/);
  });

  it('renders US cents as dollars', () => {
    expect(formatMinorUnits(599, 'USD')).toBe('$5.99');
  });

  // Whole rupees are the house style on every other price surface — the paywall
  // card for this same plan renders "₹499", and the backend's plan copy is
  // `₹${Math.round(paise / 100)}` — so a formatter that kept Intl's default two
  // places would leave the Settings card describing a plan differently from the
  // screen it was bought on.
  it('renders a whole amount without its empty decimals', () => {
    expect(formatMinorUnits(100, 'INR')).toBe('₹1');
    expect(formatMinorUnits(6000, 'USD')).toBe('$60');
  });

  // Three-decimal currencies fail the other way: 5990 fils is KD 5.990, and
  // /100 would have quoted KD 59.90.
  it('gives a three-place currency all three places', () => {
    // Matched rather than compared: en-US separates a currency CODE from its
    // amount with a non-breaking space, which is invisible in a diff.
    expect(formatMinorUnits(5990, 'KWD')).toMatch(/^KWD\s5\.990$/);
  });

  it('renders zero as a real price rather than an empty string', () => {
    expect(formatMinorUnits(0, 'USD')).toBe('$0');
  });

  it('keeps the sign on a refund', () => {
    expect(formatMinorUnits(-599, 'USD')).toBe('-$5.99');
  });

  // What the pin above hides. A price the reader cannot parse is worse than no
  // price, so the formatter has to hand Intl the device's own locale rather
  // than one of its choosing — an "en-US" baked in here would print Latin
  // digits and Western grouping to every storefront Apple sells in.
  it('formats in the device locale, not one of its own choosing', () => {
    const requested: unknown[] = [];
    Intl.NumberFormat = function RecordingNumberFormat(
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      requested.push(locales);
      return new RealNumberFormat(locales, options);
    } as unknown as typeof Intl.NumberFormat;

    try {
      formatMinorUnits(599, 'USD');
    } finally {
      pinLocale('en-US');
    }

    expect(requested.length).toBeGreaterThan(0);
    expect(requested.every(locale => locale === undefined)).toBe(true);
  });

  // Intl currency data is not guaranteed on every engine build we ship to, and
  // a paywall that throws is worse than one that reads "USD 5.99".
  describe('when the engine has no usable Intl', () => {
    // Whatever is installed on entry, which is the pinned constructor and not
    // the platform one: restoring the platform one here would silently unpin
    // every test that ran after this block.
    let previous: typeof Intl.NumberFormat;

    beforeEach(() => {
      previous = Intl.NumberFormat;
      // @ts-expect-error deliberately replacing the platform constructor
      Intl.NumberFormat = () => {
        throw new Error('no ICU in this build');
      };
    });

    afterEach(() => {
      Intl.NumberFormat = previous;
    });

    it('falls back to the code beside the number, never a bare symbol', () => {
      expect(formatMinorUnits(599, 'XYZ')).toBe('XYZ 5.99');
    });

    it('does not throw', () => {
      expect(() => formatMinorUnits(0, 'JPY')).not.toThrow();
      expect(currencyExponent('JPY')).toBe(2);
    });
  });
});
