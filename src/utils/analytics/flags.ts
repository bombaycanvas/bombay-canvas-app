import {
  POSTHOG_ERRORS_ENABLED,
  POSTHOG_EVENTS_ENABLED,
  POSTHOG_LOGS_ENABLED,
  POSTHOG_SESSION_REPLAY_ENABLED,
} from '@env';

// Each PostHog feature switches independently. Unset means ON, so a build that
// omits these behaves exactly as before; POSTHOG_API_KEY stays the master
// switch that turns the client off entirely.
//
// react-native-dotenv inlines these at BUILD time — a change needs a Metro
// restart with a cleared cache, not just a reload.
const isEnabled = (value: string | undefined): boolean =>
  value === undefined || value.trim() === ''
    ? true
    : ['true', '1'].includes(value.trim().toLowerCase());

export const EVENTS_ENABLED = isEnabled(POSTHOG_EVENTS_ENABLED);
export const LOGS_ENABLED = isEnabled(POSTHOG_LOGS_ENABLED);
export const SESSION_REPLAY_ENABLED = isEnabled(POSTHOG_SESSION_REPLAY_ENABLED);
export const ERRORS_ENABLED = isEnabled(POSTHOG_ERRORS_ENABLED);
