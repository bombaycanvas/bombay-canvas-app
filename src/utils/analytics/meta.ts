import { Platform } from 'react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import {
  getTrackingStatus,
  requestTrackingPermission,
} from 'react-native-tracking-transparency';
import { buildAppDataHeader } from './appData';

/**
 * iOS only. Apple requires an explicit prompt before an app may use the
 * advertising identifier. Android has no equivalent — getTrackingStatus()
 * returns 'unavailable' there, which we treat as allowed.
 *
 * Ask at a moment the user understands WHY, not on first launch. A cold prompt
 * gets denied far more often, and a denial is permanent unless the user digs
 * into iOS Settings.
 */
export const initMetaSdk = async (): Promise<void> => {
  // Android has no ATT concept — getTrackingStatus() returns 'unavailable'
  // there, which counts as allowed. Computed for both platforms because the
  // same boolean has to reach the server-side snapshot below.
  let status = await getTrackingStatus();

  if (Platform.OS === 'ios' && status === 'not-determined') {
    status = await requestTrackingPermission();
  }

  const allowed = status === 'authorized' || status === 'unavailable';

  if (Platform.OS === 'ios') {
    // Must be set BEFORE initializeSDK, or the first events go out with the
    // wrong permission state attached and Meta discards them.
    await Settings.setAdvertiserTrackingEnabled(allowed);
  }

  Settings.initializeSDK();

  // Same boolean the SDK just got. If the client event says denied and the
  // server event says allowed, the two describe one user differently and
  // deduplication quality suffers.
  buildAppDataHeader(allowed);
};

/**
 * Every tracked action in the app goes through this one function.
 *
 * `eventId` is the deduplication key. The backend reports these same
 * conversions through the Conversions API, and Meta merges the two into ONE
 * conversion only when event_name AND event_id both match, within 48 hours.
 *
 * Events the backend never reports (InitiateCheckout, ViewContent) have nothing
 * to merge with, so they are sent unkeyed. For events the backend DOES report,
 * an unkeyed send would guarantee the double-count we're trying to avoid — so
 * callers must always pass the Razorpay ID both sides can derive independently.
 *
 * Tracking must never break a purchase. Everything here is fire-and-forget and
 * swallows its own errors.
 */
export const track = (
  eventName: string,
  params?: { value?: number; currency?: string },
  eventId?: string,
): void => {
  try {
    const payload: Record<string, string | number> = {};

    if (eventId) payload.event_id = eventId;
    if (params?.currency) payload.fb_currency = params.currency;

    if (params?.value !== undefined) {
      AppEventsLogger.logEvent(eventName, params.value, payload);
      return;
    }

    AppEventsLogger.logEvent(eventName, payload);
  } catch (err) {
    console.warn('[analytics] track failed', eventName, err);
  }
};
