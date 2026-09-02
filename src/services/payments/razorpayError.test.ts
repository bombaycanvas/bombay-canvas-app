import { isCheckoutDismissal } from './razorpayError';

// ---------------------------------------------------------------------------
// The cost of each mistake is asymmetric and both are bad, so both directions
// are asserted here: a dismissal read as a failure shows the user an error for
// something they chose to do, and a failure read as a dismissal hides a real
// payment problem behind a silent close.
// ---------------------------------------------------------------------------

describe('isCheckoutDismissal', () => {
  it('recognises the SDK cancellation code', () => {
    expect(
      isCheckoutDismissal({ code: 2, description: 'Payment cancelled by user' }),
    ).toBe(true);
  });

  it('recognises the code even when the description is missing', () => {
    expect(isCheckoutDismissal({ code: 2 })).toBe(true);
  });

  it('recognises a string code, as the bridge sometimes sends', () => {
    expect(isCheckoutDismissal({ code: '2' })).toBe(true);
  });

  it('falls back to the description when no code is set', () => {
    expect(
      isCheckoutDismissal({
        description: 'Payment processing cancelled by user',
      }),
    ).toBe(true);
  });

  it('accepts the American spelling', () => {
    expect(isCheckoutDismissal({ description: 'Payment canceled by user' })).toBe(
      true,
    );
  });

  it('unwraps an Error whose message carries the JSON payload', () => {
    const err = new Error('{"code":2,"description":"Payment cancelled by user"}');
    expect(isCheckoutDismissal(err)).toBe(true);
  });

  // A payment the BANK cancelled is a failure the user has to be told about —
  // it is not them backing out, and swallowing it would strand them wondering
  // why nothing happened.
  it('does NOT treat a gateway cancellation as a dismissal', () => {
    expect(
      isCheckoutDismissal({
        code: 5,
        description: 'Payment was cancelled by the bank',
      }),
    ).toBe(false);
  });

  it.each([
    [{ code: 0, description: 'Network error' }],
    [{ code: 1, description: 'Invalid options' }],
    [{ code: 5, description: 'Unknown error occurred' }],
    [new Error('Failed to create subscription on server')],
    [null],
    [undefined],
    ['cancelled by user'], // a bare string is not the SDK's shape
    [{}],
  ])('treats %p as a real failure', input => {
    expect(isCheckoutDismissal(input)).toBe(false);
  });
});
