import { captureError, errorFingerprint, isExpectedError } from './errors';
import { posthog } from './posthog';

// Error tracking is metered and mirrors every console.error carrying an Error,
// so what matters is what gets filtered out and what collapses into one issue.

describe('isExpectedError', () => {
  it('filters a 4xx ApiError — the server answering, not a defect', () => {
    expect(isExpectedError(Object.assign(new Error('Bad password'), { status: 401 }))).toBe(true);
    expect(isExpectedError(Object.assign(new Error('Not found'), { status: 404 }))).toBe(true);
  });

  it('keeps a 5xx ApiError', () => {
    expect(isExpectedError(Object.assign(new Error('Server error'), { status: 500 }))).toBe(false);
  });

  it('filters an offline transport failure', () => {
    expect(isExpectedError(new TypeError('Network request failed'))).toBe(true);
  });

  it('keeps a plain error', () => {
    expect(isExpectedError(new Error('Cannot read property id of undefined'))).toBe(false);
  });
});

describe('errorFingerprint', () => {
  it('groups two throws from the same line', () => {
    const make = () => new Error('playback failed');
    expect(errorFingerprint(make())).toBe(errorFingerprint(make()));
  });

  it('separates different messages', () => {
    expect(errorFingerprint(new Error('a'))).not.toBe(errorFingerprint(new Error('b')));
  });

  it('handles a non-Error throw', () => {
    expect(errorFingerprint({ code: 'E_UNKNOWN' })).toContain('raw|');
  });
});

describe('captureError', () => {
  let spy: jest.SpyInstance;

  beforeEach(() => {
    spy = jest.spyOn(posthog, 'captureException').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends an unexpected error once, then dedupes it', () => {
    // Built from one line so both throws share a top stack frame, which is what
    // the fingerprint groups on.
    const message = `unique ${Date.now()}`;
    const make = () => new Error(message);

    captureError(make());
    captureError(make());

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('does not send a filtered error', () => {
    captureError(Object.assign(new Error('nope'), { status: 403 }));
    captureError(null);
    captureError(undefined);

    expect(spy).not.toHaveBeenCalled();
  });
});
