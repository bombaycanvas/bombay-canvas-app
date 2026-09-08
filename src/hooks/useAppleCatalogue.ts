import { useQuery } from '@tanstack/react-query';
import { getAppleCatalogue } from '../services/iap/appleIap';
import { IS_APPLE_RAIL } from '../utils/paymentRail';

// The App Store is the only place the charged price and the intro-offer
// eligibility exist, so the paywall cannot be rendered honestly without this.
// It is keyed on nothing: both answers belong to the Apple ID signed into the
// device, not to the Canvas account, and neither changes on login.
/** The App Store's own prices and intro-offer eligibility. Idle off the Apple rail. */
export const useAppleCatalogue = () =>
  useQuery({
    queryKey: ['appleCatalogue'],
    queryFn: getAppleCatalogue,
    enabled: IS_APPLE_RAIL,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
