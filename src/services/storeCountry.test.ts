// The store country decides which currency the backend quotes, so the lookup
// must be cached when it succeeds, retried (throttled) when it found nothing,
// and report when it has settled so the plans query can wait for it.

const mockGetStorefront = jest.fn();
const mockCache: Record<string, string> = {};

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve(true)),
  endConnection: jest.fn(() => Promise.resolve(true)),
  getStorefront: (...args: unknown[]) => mockGetStorefront(...args),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockCache[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockCache[key] = value;
    return Promise.resolve();
  }),
}));
jest.mock('../utils/analytics', () => ({
  log: { info: jest.fn(), warn: jest.fn() },
}));

type StoreCountry = typeof import('./storeCountry');

// Module state (the memoised lookup) is per import, so each test gets a fresh
// copy. Loaded as a release build: Expo inlines the developer's own
// EXPO_PUBLIC_DEV_STORE_COUNTRY at compile time, and the override only applies in __DEV__.
const load = (): StoreCountry => {
  const dev = (globalThis as any).__DEV__;
  (globalThis as any).__DEV__ = false;
  let mod!: StoreCountry;
  try {
    jest.isolateModules(() => {
      mod = require('./storeCountry');
    });
  } finally {
    (globalThis as any).__DEV__ = dev;
  }
  return mod;
};

let now = 1_000_000;

beforeEach(() => {
  mockGetStorefront.mockReset();
  for (const key of Object.keys(mockCache)) delete mockCache[key];
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('getStoreCountry', () => {
  it('looks the country up once and then serves it', async () => {
    mockGetStorefront.mockResolvedValue('in');
    const { getStoreCountry, peekStoreCountry } = load();

    await expect(getStoreCountry()).resolves.toBe('IN');
    await expect(getStoreCountry()).resolves.toBe('IN');

    expect(mockGetStorefront).toHaveBeenCalledTimes(1);
    expect(peekStoreCountry()).toBe('IN');
  });

  // Play Services not ready at cold start must not cost the whole session.
  it('retries a lookup that found nothing, but not before the throttle', async () => {
    mockGetStorefront.mockRejectedValueOnce(new Error('billing unavailable'));
    const { getStoreCountry } = load();

    await expect(getStoreCountry()).resolves.toBeNull();

    now += 5_000;
    await expect(getStoreCountry()).resolves.toBeNull();
    expect(mockGetStorefront).toHaveBeenCalledTimes(1);

    mockGetStorefront.mockResolvedValue('US');
    now += 30_000;
    await expect(getStoreCountry()).resolves.toBe('US');
    expect(mockGetStorefront).toHaveBeenCalledTimes(2);
  });

  it('keeps a cached country when the live lookup fails, without retrying', async () => {
    mockCache.storeCountry = 'IN';
    mockGetStorefront.mockRejectedValue(new Error('billing unavailable'));
    const { getStoreCountry } = load();

    await expect(getStoreCountry()).resolves.toBe('IN');
    now += 60_000;
    await expect(getStoreCountry()).resolves.toBe('IN');
    expect(mockGetStorefront).toHaveBeenCalledTimes(1);
  });
});

describe('isStoreCountrySettled', () => {
  it('is false until the first lookup finishes, found or not', async () => {
    mockGetStorefront.mockRejectedValue(new Error('billing unavailable'));
    const { getStoreCountry, isStoreCountrySettled } = load();

    expect(isStoreCountrySettled()).toBe(false);
    await getStoreCountry();
    expect(isStoreCountrySettled()).toBe(true);
  });
});
