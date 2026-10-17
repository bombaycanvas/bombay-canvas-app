import { formatIndianMobile } from './razorpayPrefill';

describe('formatIndianMobile', () => {
  it('reduces every unmistakably Indian form to the bare national number', () => {
    for (const mobile of ['+91 98765 43210', '9876543210', '919876543210']) {
      expect(formatIndianMobile(mobile)).toBe('9876543210');
    }
  });

  // The last ten digits of a foreign number read as an Indian mobile to Razorpay.
  it('leaves a non-Indian number for the user to enter', () => {
    expect(formatIndianMobile('+1 415 555 0134')).toBeUndefined();
    // A bare US number: ten digits, but not an Indian mobile (6-9 first).
    expect(formatIndianMobile('4155550134')).toBeUndefined();
  });

  // A leading zero is how a UK mobile is written too, so it can't be trusted.
  it('does not guess at a leading-zero number', () => {
    expect(formatIndianMobile('07123 456789')).toBeUndefined();
    expect(formatIndianMobile('09876543210')).toBeUndefined();
  });

  it('prefills nothing for a missing or partial number', () => {
    expect(formatIndianMobile(undefined)).toBeUndefined();
    expect(formatIndianMobile('')).toBeUndefined();
    expect(formatIndianMobile('98765')).toBeUndefined();
  });
});
