// ---------------------------------------------------------------------------
// The query keys whose contents depend on the user's subscription state.
//
// Lives in config/ (and imports nothing) so BOTH the invalidation helper in
// api/subscription.ts and the disk-persistence filter in reactQueryPersist.ts
// can read the same list without an import cycle. Two hand-maintained copies is
// how a key ends up refreshed on entitlement changes but still restored stale
// from AsyncStorage on the next cold start.
// ---------------------------------------------------------------------------

/**
 * The AUTHORITY on "what may this user watch": the subscription row itself, the
 * denormalized user record, and the offered plans (the ₹1 trial disappears once
 * it is consumed).
 *
 * These are NEVER persisted to disk — see reactQueryPersist.ts. Billing state is
 * volatile and server-owned: a value written to AsyncStorage during checkout is
 * wrong the moment the activation webhook lands, and restoring it on a later
 * launch resurrects a paywall for a subscription the user already paid for. They
 * are cheap to refetch and always must be.
 */
export const ENTITLEMENT_AUTHORITY_KEYS = [
  'mySubscription',
  'userData',
  'subscriptionPlans',
] as const;

/**
 * Every cache that must refresh when subscription state moves: the authority
 * keys above plus the content lists and detail that carry per-user lock flags.
 * Anything that moves entitlement refreshes the whole set, so no screen is left
 * rendering a mix.
 *
 * The content keys stay disk-persisted (they are the cold-start UX and are
 * expensive to refetch); they are kept honest by being invalidated here rather
 * than by being thrown away on every launch.
 */
export const ENTITLEMENT_QUERY_KEYS: string[][] = [
  ...ENTITLEMENT_AUTHORITY_KEYS.map(key => [key]),
  ['moviesData'],
  ['moviesDataById'],
  ['listRecommendedSeries'],
  ['playEpisode'],
];

/** True when a query key belongs to the never-persist authority set. */
export const isEntitlementAuthorityKey = (queryKey: readonly unknown[]) =>
  typeof queryKey?.[0] === 'string' &&
  (ENTITLEMENT_AUTHORITY_KEYS as readonly string[]).includes(
    queryKey[0] as string,
  );
