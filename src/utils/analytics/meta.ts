import { Platform } from 'react-native';
import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';
import {
  getTrackingStatus,
  requestTrackingPermission,
} from 'react-native-tracking-transparency';
import { buildAppDataHeader } from './appData';

export const initMetaSdk = async (): Promise<void> => {
  let status = await getTrackingStatus();

  if (Platform.OS === 'ios' && status === 'not-determined') {
    status = await requestTrackingPermission();
  }

  const allowed = status === 'authorized' || status === 'unavailable';

  if (Platform.OS === 'ios') {
    await Settings.setAdvertiserTrackingEnabled(allowed);
  }
  Settings.initializeSDK();
  buildAppDataHeader(allowed);
};


export const track = (
  eventName: string,
  params?: {
    value?: number;
    currency?: string;
    [key: string]: string | number | undefined;
  },
  eventId?: string,
): void => {
  try {
    const payload: Record<string, any> = {};

    if (eventId) payload.event_id = eventId;
    if (params?.currency) payload.fb_currency = params.currency;

    for (const [key, value] of Object.entries(params ?? {})) {
      if (key === 'value' || key === 'currency' || value === undefined) continue;
      payload[key] = value;
    }

    if (params?.value !== undefined) {
      AppEventsLogger.logEvent(eventName, params.value, payload);
      return;
    }

    AppEventsLogger.logEvent(eventName, payload);
  } catch (err) {
    console.warn('[analytics] track failed', eventName, err);
  }
};
