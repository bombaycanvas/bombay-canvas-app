import {
  ENTITLEMENT_AUTHORITY_KEYS,
  ENTITLEMENT_QUERY_KEYS,
  isEntitlementAuthorityKey,
} from './entitlementQueryKeys';

// ---------------------------------------------------------------------------
// The disk-persistence filter. This module is the single guard stopping billing
// state from being restored from AsyncStorage on a cold start — the persister
// keeps entries for 7 days, and the query client does not refetch on mount by
// default, so a key that slips through here can re-sell a subscription the user
// already owns for a week.
// ---------------------------------------------------------------------------

describe('isEntitlementAuthorityKey', () => {
  it.each([...ENTITLEMENT_AUTHORITY_KEYS])(
    'excludes %s from disk persistence',
    key => {
      expect(isEntitlementAuthorityKey([key])).toBe(true);
    },
  );

  it('matches on the key PREFIX, since these queries are scoped by user id', () => {
    // The real keys are ['mySubscription', <userId>] — matching only the exact
    // array would persist every logged-in user's subscription.
    expect(isEntitlementAuthorityKey(['mySubscription', 'user_1'])).toBe(true);
    expect(isEntitlementAuthorityKey(['subscriptionPlans', 'anonymous'])).toBe(
      true,
    );
  });

  it('keeps content caches persisted — they are the cold-start UX', () => {
    expect(isEntitlementAuthorityKey(['moviesData'])).toBe(false);
    expect(isEntitlementAuthorityKey(['playEpisode', 'ep_1'])).toBe(false);
    expect(isEntitlementAuthorityKey(['subscriptionHistory', 1, 20])).toBe(
      false,
    );
  });

  it('tolerates malformed keys rather than throwing inside the persister', () => {
    // shouldDehydrateQuery runs for EVERY query on every persist tick; a throw
    // here would silently kill persistence for the whole app.
    expect(isEntitlementAuthorityKey([])).toBe(false);
    expect(isEntitlementAuthorityKey([123])).toBe(false);
    expect(isEntitlementAuthorityKey([null])).toBe(false);
    expect(isEntitlementAuthorityKey([{ a: 1 }])).toBe(false);
  });
});

describe('ENTITLEMENT_QUERY_KEYS', () => {
  it('invalidates every authority key, so the two lists cannot drift apart', () => {
    const invalidated = ENTITLEMENT_QUERY_KEYS.map(k => k[0]);
    for (const key of ENTITLEMENT_AUTHORITY_KEYS) {
      expect(invalidated).toContain(key);
    }
  });

  it('also invalidates the content caches that carry per-user lock flags', () => {
    const invalidated = ENTITLEMENT_QUERY_KEYS.map(k => k[0]);
    expect(invalidated).toEqual(
      expect.arrayContaining([
        'moviesData',
        'moviesDataById',
        'listRecommendedSeries',
        'playEpisode',
      ]),
    );
  });

  it('is a list of single-segment key prefixes (invalidateQueries matches by prefix)', () => {
    for (const key of ENTITLEMENT_QUERY_KEYS) {
      expect(key).toHaveLength(1);
      expect(typeof key[0]).toBe('string');
    }
  });
});
