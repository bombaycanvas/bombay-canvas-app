import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { initIap, teardownIap } from '../services/iap/appleIap';
import { getPaymentRail } from '../services/paymentRail';
import { IS_APPLE_RAIL } from '../utils/paymentRail';
import {
  APPLE_OWNERSHIP_CONFLICT_QUERY_KEY,
  readAppleOwnershipConflict,
  setAppleOwnershipConflict,
  type AppleOwnershipConflict,
} from '../components/subscription/appleOwnershipConflict';

/** Keeps the Apple rail connected and silently claims what this Apple ID already owns. */
export const useAppleIapSync = () => {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const userId = useAuthStore(state => state.user?.id ?? null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!IS_APPLE_RAIL) return;

    // Connecting also installs the purchase listeners, which is how StoreKit's
    // launch replay of a transaction we failed to verify last session gets its
    // second chance at being granted and finished.
    initIap().catch(error =>
      console.warn('[iap] Store connection failed at launch', error),
    );

    // teardownIap swallows its own failures — cleanup must be total.
    return () => {
      teardownIap();
    };
  }, []);

  useEffect(() => {
    if (!IS_APPLE_RAIL || !isAuthenticated) return;

    // Cleared before every restore, not just written after one. The verdict
    // belongs to whoever was signed in when it was recorded, and carrying it
    // across an account switch would lock the paywall for an account the App
    // Store has no quarrel with.
    setAppleOwnershipConflict(queryClient, null);

    // Required, not a nicety. Streamlined Purchasing is on and cannot be
    // disabled, so a subscription bought from the App Store product page reaches
    // the server with no appAccountToken and can only ever be attached to an
    // account by replaying the App Store's own receipts. Runs on launch and
    // again on every login — and stays silent, because it is housekeeping the
    // user never asked for and must not block or interrupt anything.
    console.log('[iap] Claiming App Store purchases', { userId });
    getPaymentRail()
      .restore()
      .then(restored => {
        const conflict = readAppleOwnershipConflict(restored);
        if (conflict) {
          // Silent to the user here on purpose: the paywall is the only place
          // this matters, and interrupting a launch to announce it would be
          // noise for anyone who never intended to subscribe today.
          console.warn(
            '[iap] This Apple ID is linked to another Canvas account',
            { userId, transactionId: conflict.transactionId },
          );
        }
        setAppleOwnershipConflict(queryClient, conflict);
      })
      .catch(error => console.warn('[iap] Silent restore failed', error));
  }, [isAuthenticated, userId, queryClient]);
};

/**
 * The collision the silent restore found, or null when this Apple ID is free to
 * buy on this account.
 *
 * Pushed by useAppleIapSync above and never fetched, which is why it is not in
 * ENTITLEMENT_QUERY_KEYS: the answer is a by-product of the /apple/link call
 * that already runs on launch and on every login, and refetching it here would
 * re-verify every JWS on the device only to re-learn what the sync just wrote.
 */
export const useAppleOwnershipConflict = (): AppleOwnershipConflict | null =>
  useQuery({
    queryKey: APPLE_OWNERSHIP_CONFLICT_QUERY_KEY,
    queryFn: () => null as AppleOwnershipConflict | null,
    enabled: false,
    staleTime: Infinity,
    initialData: null,
  }).data;
