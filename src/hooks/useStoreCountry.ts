import { useSyncExternalStore } from 'react';
import {
  peekStoreCountry,
  subscribeStoreCountry,
} from '../services/storeCountry';

/** The store country the API is being told, re-rendering when it changes. */
export const useStoreCountry = (): string | null =>
  useSyncExternalStore(subscribeStoreCountry, peekStoreCountry);
