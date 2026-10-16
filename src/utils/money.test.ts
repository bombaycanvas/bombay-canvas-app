import {
  currencyExponent,
  formatMinorUnits,
  minorToMajorUnits,
  setDisplayCountry,
  splitMinorUnits,
} from './money';

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

  // An engine without numberingSystem must still print a price, not the
  // "USD 19.99" last resort.
  it('falls back to the device default when Latin digits are rejected', () => {
    Intl.NumberFormat = function NoNumberingSystemNumberFormat(
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      if (options?.numberingSystem) {
        throw new RangeError('numberingSystem unsupported');
      }
      return new RealNumberFormat(locales ?? 'en-US', options);
    } as unknown as typeof Intl.NumberFormat;

    try {
      expect(formatMinorUnits(1999, 'USD')).toBe('$19.99');
    } finally {
      pinLocale('en-US');
    }
  });

  // A dollar is a bare "$" only to a US store account. Everyone else priced in
  // USD (Canada, Australia, …) keeps the locale's "US$", so the price can't be
  // read as their own dollar. Simulated as an en-IN Android device, whose
  // locale writes "US$" (Node's en-US would hide the difference).
  describe('a dollar price on a device whose locale writes "US$"', () => {
    beforeEach(() => {
      Intl.NumberFormat = function EnInLikeNumberFormat(
        locales?: Intl.LocalesArgument,
        options?: Intl.NumberFormatOptions,
      ) {
        const real = new RealNumberFormat(locales ?? 'en-US', options);
        const usd = options?.currency === 'USD';
        return {
          format: (value: number) =>
            usd ? real.format(value).replace('$', 'US$') : real.format(value),
          formatToParts: (value: number) =>
            real
              .formatToParts(value)
              .map(part =>
                usd && part.type === 'currency'
                  ? { ...part, value: 'US$' }
                  : part,
              ),
          resolvedOptions: () => real.resolvedOptions(),
        };
      } as unknown as typeof Intl.NumberFormat;
    });

    afterEach(() => {
      setDisplayCountry(null);
      pinLocale('en-US');
    });

    it('writes "$" for a US store account', () => {
      setDisplayCountry('US');

      expect(formatMinorUnits(1999, 'USD')).toBe('$19.99');
      expect(splitMinorUnits(1999, 'USD')).toEqual({
        symbol: '$',
        amount: '19.99',
      });
    });

    it('keeps "US$" for any other store account', () => {
      setDisplayCountry('AU');

      expect(formatMinorUnits(1999, 'USD')).toBe('US$19.99');
      expect(splitMinorUnits(1999, 'USD')).toEqual({
        symbol: 'US$',
        amount: '19.99',
      });
    });

    it('lets the locale decide when the country is unknown', () => {
      expect(formatMinorUnits(1999, 'USD')).toBe('US$19.99');
    });

    it('leaves the rupee alone', () => {
      setDisplayCountry('US');

      expect(formatMinorUnits(49900, 'INR')).toBe('₹499');
    });
  });

  // Only the symbol is swapped, so a locale that writes it after the number
  // keeps its own shape.
  it('keeps the fr-CA shape, with or without the US swap', () => {
    pinLocale('fr-CA');
    try {
      expect(formatMinorUnits(1999, 'USD')).toMatch(/^19,99\s\$\sUS$/);
      setDisplayCountry('US');
      expect(formatMinorUnits(1999, 'USD')).toMatch(/^19,99\s\$$/);
    } finally {
      setDisplayCountry(null);
      pinLocale('en-US');
    }
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

describe('minorToMajorUnits', () => {
  it('divides by the currency’s own exponent, not by a hundred', () => {
    expect(minorToMajorUnits(49900, 'INR')).toBe(499);
    expect(minorToMajorUnits(1999, 'USD')).toBe(19.99);
    expect(minorToMajorUnits(1200, 'JPY')).toBe(1200);
  });
});

describe('splitMinorUnits', () => {
  it('splits rupees the way the Razorpay cards draw them', () => {
    expect(splitMinorUnits(49900, 'INR')).toEqual({ symbol: '₹', amount: '499' });
  });

  it('keeps the cents on a dollar price', () => {
    expect(splitMinorUnits(1999, 'USD')).toEqual({ symbol: '$', amount: '19.99' });
  });

  // An engine without formatToParts still formats; the card then shows the
  // whole string in one style rather than a price with no symbol.
  it('hands back the whole string when the symbol cannot be named', () => {
    const previous = Intl.NumberFormat;
    Intl.NumberFormat = function NoPartsNumberFormat(
      locales?: Intl.LocalesArgument,
      options?: Intl.NumberFormatOptions,
    ) {
      const real = new previous(locales, options);
      return {
        format: (value: number) => real.format(value),
        resolvedOptions: () => real.resolvedOptions(),
        formatToParts: () => {
          throw new Error('formatToParts unsupported');
        },
      };
    } as unknown as typeof Intl.NumberFormat;

    try {
      expect(splitMinorUnits(49900, 'INR')).toEqual({ symbol: null, amount: '₹499' });
    } finally {
      Intl.NumberFormat = previous;
    }
  });
});

// Marathi and Bengali format numbers in their own scripts by default. Prices
// must stay in Latin digits, matching the backend's plan copy beside them.
describe('in a locale with its own digits', () => {
  afterEach(() => pinLocale('en-US'));

  it.each(['mr-IN', 'bn-IN'])('writes %s prices in Latin digits', locale => {
    pinLocale(locale);

    expect(formatMinorUnits(49900, 'INR')).toBe('₹499');
    expect(splitMinorUnits(49900, 'INR')).toEqual({ symbol: '₹', amount: '499' });
  });
});
