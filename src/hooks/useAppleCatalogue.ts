import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAppleCatalogue } from '../services/iap/appleIap';
import { IS_APPLE_RAIL } from '../utils/paymentRail';

// The App Store is the only place the charged price and the intro-offer
// eligibility exist, so the paywall cannot be rendered honestly without this.
// It is keyed on nothing: both answers belong to the Apple ID signed into the
// device, not to the Canvas account, and neither changes on login.
/** The App Store's own prices and intro-offer eligibility. Idle off the Apple rail. */
export const useAppleCatalogue = () => {
  const query = useQuery({
    queryKey: ['appleCatalogue'],
    queryFn: getAppleCatalogue,
    enabled: IS_APPLE_RAIL,
    staleTime: 5 * 60 * 1000,
    // The paywall has nothing to fall back on when this fails — the DB's rupee
    // figure is not what an App Store buyer is charged — so a card left
    // unpriced is a card that cannot be sold. One more attempt is cheap
    // against that, and StoreKit's first call on a cold launch is the one that
    // times out.
    retry: 2,
  });

  // Both answers are owned by the App Store, and both change while the app is
  // open: a price edit or an introductory offer going live in App Store Connect
  // lands whenever Apple propagates it, and eligibility flips the moment the
  // user subscribes from Settings or restores on another device. Without this
  // the paywall keeps quoting whatever the launch fetch saw for as long as the
  // app stays resident, which on a phone is days.
  //
  // Deliberately unconditional on staleTime: coming back to the app IS the
  // moment the prices matter, and one StoreKit call costs nothing next to
  // showing a price the store no longer honours.
  const { refetch } = query;
  useEffect(() => {
    if (!IS_APPLE_RAIL) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      console.log('[iap] Foregrounded — refetching the store catalogue');
      refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  return query;
};
