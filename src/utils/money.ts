// Apple bills in roughly forty storefront currencies, and dividing minor units
// by 100 is only right for about thirty of them. Yen and won have no minor unit
// at all (¥1,200 is stored as 1200, and /100 would advertise ¥12), while the
// Gulf currencies — KWD, BHD, OMR, JOD, TND — carry three decimal places, so
// /100 there understates the price by a factor of ten. Rather than ship a
// currency table that goes stale the next time ISO 4217 moves an exponent, ask
// Intl: both Hermes and the JSC builds we ship expose the currency data, and
// the resolved options carry the exponent the currency actually uses.

/** Decimal places `currency` uses — 2 for INR/USD, 0 for JPY/KRW, 3 for KWD/BHD. */
export const currencyExponent = (currency: string): number => {
  try {
    // maximumFractionDigits on a *currency* formatter is seeded from the
    // currency's ISO exponent, which is exactly what we need and is not
    // otherwise reachable from the platform Intl surface.
    const { maximumFractionDigits } = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).resolvedOptions();
    // The lib types leave this optional even though a currency formatter always
    // resolves it; the ?? is for the compiler and for an engine that stubs it.
    return maximumFractionDigits ?? 2;
  } catch {
    // An engine built without currency data, or a code Intl rejects. Two places
    // is the majority case and keeps a wrong answer within one order of
    // magnitude, whereas throwing would blank a price the user is owed.
    return 2;
  }
};

/**
 * Render `minorUnits` of `currency` for display — 49900 INR -> "₹499",
 * 599 USD -> "$5.99", 1200 JPY -> "¥1,200". Falls back to "USD 5.99" (code,
 * space, number) when the engine cannot format the pair, never to a bare
 * symbol: an unlabelled figure on the Apple rail could be read as any of forty
 * currencies.
 */
export const formatMinorUnits = (
  minorUnits: number,
  currency: string,
): string => {
  const unit = 10 ** currencyExponent(currency);
  const major = minorUnits / unit;
  // An amount with nothing after the decimal point is rendered without one.
  // Every other price surface in the product quotes whole rupees — the paywall
  // cards build "₹499" from the plan's own paise, and the backend's plan copy is
  // `₹${Math.round(paise / 100)}` — so a details card reading "₹499.00" would
  // describe the same subscription differently from the screen the user just
  // bought it on. The rule is stated in minor units rather than as a per-
  // currency exception so it holds for a storefront that happens to price on a
  // whole unit too ("$60/yr"), and a price with real fractional units keeps
  // every place it has: 599 USD stays "$5.99", 5990 KWD stays "KD 5.990".
  const isWholeUnits = minorUnits % unit === 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      // Both bounds, never one: the minimum defaults to the currency's exponent
      // and Intl throws when it exceeds the maximum.
      ...(isWholeUnits
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : {}),
    }).format(major);
  } catch {
    return `${currency} ${major}`;
  }
};
