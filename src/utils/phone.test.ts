import { callingCodeOf, isValidPhone, splitPhone, toE164 } from './phone';

describe('splitPhone', () => {
  it('defaults to India with an empty number', () => {
    expect(splitPhone()).toEqual({ country: 'IN', number: '' });
    expect(splitPhone(null)).toEqual({ country: 'IN', number: '' });
    expect(splitPhone('garbage')).toEqual({ country: 'IN', number: '' });
  });

  it.each([
    ['+919876543210', 'IN', '9876543210'],
    ['+12025550123', 'US', '2025550123'],
    ['+447400123456', 'GB', '7400123456'],
    ['+971501234567', 'AE', '501234567'],
  ])('splits %s into country + national number', (e164, country, number) => {
    expect(splitPhone(e164)).toEqual({ country, number });
  });

  it.each([
    '+919876543210',
    '+12025550123',
    '+447400123456',
    '+971501234567',
    '+449999999999', // not assigned to a region; must still round-trip
  ])('round-trips %s through toE164', e164 => {
    expect(toE164(splitPhone(e164))).toBe(e164);
  });
});

describe('toE164', () => {
  it('prefixes the calling code and strips spaces', () => {
    expect(toE164({ country: 'IN', number: '98765 43210' })).toBe(
      '+919876543210',
    );
    expect(toE164({ country: 'US', number: '202 555 0123' })).toBe(
      '+12025550123',
    );
  });
});

describe('leading trunk 0', () => {
  it.each([
    ['IN', '09876543210', '+919876543210'],
    ['IN', '0 98765 43210', '+919876543210'],
    ['GB', '07400 123456', '+447400123456'],
  ] as const)('%s %s → %s', (country, number, e164) => {
    expect(toE164({ country, number })).toBe(e164);
    expect(isValidPhone({ country, number })).toBe(true);
  });
});

describe('unusable input', () => {
  it('has no E.164 for an empty number', () => {
    expect(toE164({ country: 'IN', number: '' })).toBeUndefined();
    expect(isValidPhone({ country: 'IN', number: '' })).toBe(false);
  });

  it('never throws for regions without a numbering plan', () => {
    const antarctica = { country: 'AQ' as any, number: '12345678' };
    expect(() => toE164(antarctica)).not.toThrow();
    expect(toE164(antarctica)).toBeUndefined();
    expect(isValidPhone(antarctica)).toBe(false);
    expect(callingCodeOf('AQ' as any)).toBe('');
    expect(callingCodeOf('IN')).toBe('+91');
  });
});

describe('isValidPhone', () => {
  it('checks the number against the chosen country', () => {
    expect(isValidPhone({ country: 'IN', number: '98765 43210' })).toBe(true);
    expect(isValidPhone({ country: 'IN', number: '98765' })).toBe(false);
    expect(isValidPhone({ country: 'US', number: '9876543210' })).toBe(false);
  });
});
