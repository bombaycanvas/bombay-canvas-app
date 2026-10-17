import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { endConnection, getStorefront, initConnection } from 'react-native-iap';
import { DEV_STORE_COUNTRY } from '@env';
import { log } from '../utils/analytics';
import { setDisplayCountry } from '../utils/money';

// The Play Store account's country, sent as X-Client-Store-Country so the
// backend prices in the right currency. Android only: iOS buys through Apple,
// which prices per storefront itself.

const CACHE_KEY = 'storeCountry';

// Dev builds only, so a value left in .env can never reach a release build.
const DEV_OVERRIDE =
  __DEV__ && DEV_STORE_COUNTRY ? DEV_STORE_COUNTRY.trim().toUpperCase() : null;

// A lookup that found nothing is retried, but no more often than this, so a
// device without Play Services isn't asked on every screen.
const RETRY_AFTER_MS = 30_000;

let known: string | null = null;
let pending: Promise<string | null> | null = null;
let settled = Platform.OS !== 'android';
let lastFailureAt = 0;
let overrideLogged = false;
const listeners = new Set<() => void>();

// Prices are written for the country the API is told about (see money.ts).
if (DEV_OVERRIDE) setDisplayCountry(DEV_OVERRIDE);

const setKnown = (country: string | null) => {
  if (country === known) return;
  known = country;
  if (!DEV_OVERRIDE) setDisplayCountry(country);
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
  settled = true;
  // Nothing known after this attempt: let a later call try again rather than
  // keeping the failure for the whole session.
  if (!known) {
    lastFailureAt = Date.now();
    pending = null;
  }
  return known;
};

/** The store country for request headers right now, or null if not known yet. */
export const peekStoreCountry = (): string | null => DEV_OVERRIDE ?? known;

/** Whether the first lookup has finished (found or not); always true off Android. */
export const isStoreCountrySettled = (): boolean => settled || !!DEV_OVERRIDE;

/**
 * Resolves the store country. Looked up once per app run when it succeeds; a
 * lookup that found nothing is retried on a later call (throttled). Never rejects.
 */
export const getStoreCountry = (): Promise<string | null> => {
  // The real lookup runs even under the override, so its log always shows the
  // account's actual country; the override only decides what the API is told.
  if (
    Platform.OS === 'android' &&
    !pending &&
    Date.now() - lastFailureAt >= RETRY_AFTER_MS
  ) {
    pending = resolveStoreCountry();
  }
  if (DEV_OVERRIDE) {
    if (!overrideLogged) {
      overrideLogged = true;
      console.log('[pricing] Store country override (dev):', DEV_OVERRIDE);
      log.info('Store country override (dev)', { country: DEV_OVERRIDE });
    }
    return Promise.resolve(DEV_OVERRIDE);
  }
  return pending ?? Promise.resolve(known);
};

/** Calls `listener` whenever the known store country changes. Returns an unsubscribe. */
export const subscribeStoreCountry = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
