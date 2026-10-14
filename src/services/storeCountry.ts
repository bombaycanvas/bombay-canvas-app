import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endConnection, getStorefront, initConnection } from 'react-native-iap';
import { DEV_STORE_COUNTRY } from '@env';
import { log } from '../utils/analytics';

// The Play Store account's country, sent as X-Client-Store-Country so the
// backend prices in the right currency. Android only: iOS buys through Apple,
// which prices per storefront itself.

const CACHE_KEY = 'storeCountry';

// Dev builds only, so a value left in .env can never reach a release build.
const DEV_OVERRIDE =
  __DEV__ && DEV_STORE_COUNTRY ? DEV_STORE_COUNTRY.trim().toUpperCase() : null;

let known: string | null = null;
let pending: Promise<string | null> | null = null;
const listeners = new Set<() => void>();

const setKnown = (country: string | null) => {
  if (country === known) return;
  known = country;
  listeners.forEach(listener => listener());
};

const lookUpStorefront = async (): Promise<string | null> => {
  await initConnection();
  try {
    return (await getStorefront())?.trim().toUpperCase() || null;
  } finally {
    endConnection().catch(() => {});
  }
};

const resolveStoreCountry = async (): Promise<string | null> => {
  setKnown(await AsyncStorage.getItem(CACHE_KEY).catch(() => null));
  try {
    const country = await lookUpStorefront();
    if (country) {
      setKnown(country);
      AsyncStorage.setItem(CACHE_KEY, country).catch(() => {});
    }
    console.log('[pricing] Play Store country:', country);
    log.info('Play Store country resolved', { country });
  } catch (error) {
    console.warn('[pricing] Play Store country lookup failed', error);
    log.warn('Play Store country lookup failed', { error: String(error) });
  }
  return known;
};

/** The store country for request headers right now, or null if not known yet. */
export const peekStoreCountry = (): string | null => DEV_OVERRIDE ?? known;

/** Resolves the store country once per app run. Never rejects. */
export const getStoreCountry = (): Promise<string | null> => {
  // The real lookup runs even under the override, so its log always shows the
  // account's actual country; the override only decides what the API is told.
  if (Platform.OS === 'android') pending ??= resolveStoreCountry();
  if (DEV_OVERRIDE) {
    console.log('[pricing] Store country override (dev):', DEV_OVERRIDE);
    log.info('Store country override (dev)', { country: DEV_OVERRIDE });
    return Promise.resolve(DEV_OVERRIDE);
  }
  return pending ?? Promise.resolve(null);
};

/** Calls `listener` whenever the known store country changes. Returns an unsubscribe. */
export const subscribeStoreCountry = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
