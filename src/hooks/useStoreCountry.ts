import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  getStoreCountry,
  isStoreCountrySettled,
  peekStoreCountry,
  subscribeStoreCountry,
} from '../services/storeCountry';

/** The store country the API is being told, re-rendering when it changes. */
export const useStoreCountry = (): string | null =>
  useSyncExternalStore(subscribeStoreCountry, peekStoreCountry);

/**
 * True once the store-country lookup has finished, or after `timeoutMs` —
 * whichever comes first. Lets the plans query wait for the country instead of
 * going out IP-priced first, without a slow Play Services ever holding the
 * paywall hostage. Mounting it also retries a lookup that previously found
 * nothing (throttled in the service).
 */
export const useStoreCountrySettled = (timeoutMs = 1500): boolean => {
  const [ready, setReady] = useState(isStoreCountrySettled);

  useEffect(() => {
    let alive = true;
    const settle = () => {
      if (alive) setReady(true);
    };
    const timer = setTimeout(settle, timeoutMs);
    getStoreCountry().finally(settle);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [timeoutMs]);

  return ready;
};
