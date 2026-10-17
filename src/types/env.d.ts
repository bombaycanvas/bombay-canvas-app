declare module '@env' {
  export const BASE_URL: string;
  export const NEXT_PUBLIC_BASE_URL: string;

  export const WEB_CLIENT_ID: string;
  export const IOS_CLIENT_ID: string;
  export const POSTHOG_API_KEY: string;
  export const POSTHOG_API_HOST: string;
  export const POSTHOG_EVENTS_ENABLED: string;
  export const POSTHOG_LOGS_ENABLED: string;
  export const POSTHOG_SESSION_REPLAY_ENABLED: string;
  export const POSTHOG_ERRORS_ENABLED: string;
  export const DEV_STORE_COUNTRY: string | undefined;
  /** The app's numeric App Store id, for "update the app" links on iOS. */
  export const APPLE_APP_STORE_ID: string | undefined;
}
