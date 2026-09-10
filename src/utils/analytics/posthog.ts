import PostHog from 'posthog-react-native';
import DeviceInfo from 'react-native-device-info';
import { POSTHOG_API_KEY, POSTHOG_API_HOST } from '@env';
import { redactLogRecord } from './logRedaction';

// PostHog (product analytics) provider.

const apiKey = (POSTHOG_API_KEY || '').trim();
const host = (POSTHOG_API_HOST || '').trim() || 'https://us.i.posthog.com';

export const posthog = new PostHog(apiKey, {
  host,
  disabled: !apiKey,

  captureAppLifecycleEvents: true,

  enableSessionReplay: true,
  sessionReplayConfig: {
    maskAllTextInputs: false,
    maskAllImages: false,
    maskAllSandboxedViews: true,
    captureLog: false,

    throttleDelayMs: 2000,
  },

  enablePersistSessionIdAcrossRestart: true,


  logs: {
    serviceName: 'bombay-canvas-app',
    serviceVersion: `${DeviceInfo.getVersion()}(${DeviceInfo.getBuildNumber()})`,

    environment: __DEV__ ? 'development' : 'production',
    beforeSend: redactLogRecord,
    rateCap: { maxLogs: 200, windowMs: 10000 },
  },
});

export type EventProperties = Record<string, string | number | boolean>;

/** Person properties. Wider than event properties: booleans and explicit nulls
 *  are meaningful on a profile ("phone: null") where on an event they are noise. */
export type PersonProperties = Record<string, string | number | boolean | null>;

/** Record a product event. */
export const capture = (
  eventName: string,
  properties?: EventProperties,
): void => {
  try {
    posthog.capture(eventName, properties);
  } catch (err) {
    console.warn('[analytics] PostHog capture failed', eventName, err);
  }
};

/** Record a screen view ($screen) — PostHog's first-class screen event, which
 *  its path and funnel tools read and which a plain custom event is invisible to. */
export const screen = (
  screenName: string,
  properties?: EventProperties,
): void => {
  try {
    posthog.screen(screenName, properties);
  } catch (err) {
    console.warn('[analytics] PostHog screen failed', screenName, err);
  }
};


export const identify = (
  distinctId: string,
  properties?: PersonProperties,
): void => {
  try {
    if (!distinctId) return;
    if (posthog.getDistinctId() === distinctId) return;

    posthog.identify(distinctId, properties);
  } catch (err) {
    console.warn('[analytics] PostHog identify failed', err);
  }
};

/**
 * Unbind the current user. MUST be called on logout.
 *
 * Without it the next person to sign in on this device inherits the previous
 * user's `distinct_id` and their events are attributed to someone else — a
 * correctness bug and a privacy one, which is why this is not optional.
 */
export const reset = (): void => {
  try {
    posthog.reset();
  } catch (err) {
    console.warn('[analytics] PostHog reset failed', err);
  }
};
