import { formatIndianMobile } from './razorpayPrefill';

describe('formatIndianMobile', () => {
  it('reduces every Indian form to the bare national number', () => {
    for (const mobile of [
      '+91 98765 43210',
      '9876543210',
      '919876543210',
      '09876543210',
    ]) {
      expect(formatIndianMobile(mobile)).toBe('9876543210');
    }
  });

  // The last ten digits of a US number read as an Indian mobile to Razorpay.
  it('leaves a non-Indian number for the user to enter', () => {
    expect(formatIndianMobile('+1 415 555 0134')).toBeUndefined();
  });

  it('prefills nothing for a missing or partial number', () => {
    expect(formatIndianMobile(undefined)).toBeUndefined();
    expect(formatIndianMobile('')).toBeUndefined();
    expect(formatIndianMobile('98765')).toBeUndefined();
  });
});
