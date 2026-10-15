// Each PostHog feature switches independently. Unset means ON, so a build that
// omits these behaves exactly as before; EXPO_PUBLIC_POSTHOG_API_KEY stays the
// master switch that turns the client off entirely.
//
// Expo inlines EXPO_PUBLIC_* at BUILD time, and only for static
// `process.env.EXPO_PUBLIC_X` reads — a change needs `expo start --clear`, not
// just a reload.
const isEnabled = (value: string | undefined): boolean =>
  value === undefined || value.trim() === ''
    ? true
    : ['true', '1'].includes(value.trim().toLowerCase());

export const EVENTS_ENABLED = isEnabled(
  process.env.EXPO_PUBLIC_POSTHOG_EVENTS_ENABLED,
);
export const LOGS_ENABLED = isEnabled(
  process.env.EXPO_PUBLIC_POSTHOG_LOGS_ENABLED,
);
export const SESSION_REPLAY_ENABLED = isEnabled(
  process.env.EXPO_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED,
);
export const ERRORS_ENABLED = isEnabled(
  process.env.EXPO_PUBLIC_POSTHOG_ERRORS_ENABLED,
);
