import { classifyVerifyFailure } from './verifyFailure';

const apiError = (code: string, status = 409) =>
  Object.assign(new Error('server said no'), { code, status });

describe('classifyVerifyFailure', () => {
  it('finishes on an ownership conflict, with copy that names the way out', () => {
    const verdict = classifyVerifyFailure(
      apiError('APPLE_TRANSACTION_OWNED_BY_ANOTHER_USER'),
    );
    expect(verdict.kind).toBe('terminal');
    expect(verdict.message).toContain('another Canvas account');
    // Support has no tool that moves a subscription between accounts, so the
    // copy must not offer one. Apple owns the money and therefore the refund.
    expect(verdict.message).not.toMatch(/move it across|contact support/i);
    expect(verdict.message).toMatch(/refund/i);
  });

  // appleIap branches on this to blank the paywall's buy buttons when the
  // launch restore never got an answer. A verdict that drops the code silently
  // leaves those buttons live.
  it('carries the server code through so callers can branch on it', () => {
    expect(
      classifyVerifyFailure(apiError('APPLE_TRANSACTION_OWNED_BY_ANOTHER_USER'))
        .code,
    ).toBe('APPLE_TRANSACTION_OWNED_BY_ANOTHER_USER');
    expect(classifyVerifyFailure(apiError('INTERNAL_ERROR', 500)).code).toBe(
      'INTERNAL_ERROR',
    );
    expect(
      classifyVerifyFailure(new TypeError('offline')).code,
    ).toBeUndefined();
  });

  it.each(['APPLE_FAMILY_SHARED_UNSUPPORTED', 'APPLE_PRODUCT_NOT_SOLD'])(
    'finishes on the terminal code %s',
    code => {
      const verdict = classifyVerifyFailure(apiError(code, 403));
      expect(verdict.kind).toBe('terminal');
      expect(verdict.message).toBeTruthy();
    },
  );

  // The safety property. A wrongly finished transaction is a purchase the App
  // Store will never replay again, so anything not on the allowlist stays queued.
  it.each([
    ['a 500', apiError('INTERNAL_ERROR', 500)],
    [
      'a 502 with no code',
      Object.assign(new Error('bad gateway'), { status: 502 }),
    ],
    ['a timeout', Object.assign(new Error('timeout'), { status: 408 })],
    ['a rate limit', Object.assign(new Error('slow down'), { status: 429 })],
    ['a bare network error', new TypeError('Network request failed')],
    [
      'a server code this build has never seen',
      apiError('APPLE_SOMETHING_NEW'),
    ],
    ['a non-error throw', 'boom'],
    ['null', null],
    ['undefined', undefined],
  ])('leaves the transaction queued for %s', (_label, error) => {
    const verdict = classifyVerifyFailure(error);
    expect(verdict.kind).toBe('retryable');
    expect(verdict.message).toBeUndefined();
  });

  it('does not treat a non-string code as a classification', () => {
    const verdict = classifyVerifyFailure({ code: 409, status: 409 });
    expect(verdict.kind).toBe('retryable');
  });
});
