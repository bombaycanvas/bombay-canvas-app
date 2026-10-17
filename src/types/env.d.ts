// Public build-time config, inlined by Expo from .env locally and from EAS
// environment variables on EAS Build / EAS Update. Never put secrets here:
// every EXPO_PUBLIC_* value ships inside the JS bundle.
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_BASE_URL?: string;

    EXPO_PUBLIC_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_IOS_CLIENT_ID?: string;
    EXPO_PUBLIC_POSTHOG_API_KEY?: string;
    EXPO_PUBLIC_POSTHOG_API_HOST?: string;
    EXPO_PUBLIC_POSTHOG_EVENTS_ENABLED?: string;
    EXPO_PUBLIC_POSTHOG_LOGS_ENABLED?: string;
    EXPO_PUBLIC_POSTHOG_SESSION_REPLAY_ENABLED?: string;
    EXPO_PUBLIC_POSTHOG_ERRORS_ENABLED?: string;
    /** Dev builds only: pretend the Play Store country is this ISO code. */
    EXPO_PUBLIC_DEV_STORE_COUNTRY?: string;
    /** The app's numeric App Store id, for "update the app" links on iOS. */
    EXPO_PUBLIC_APPLE_APP_STORE_ID?: string;
  }
}

// React Native has no Node typings; Metro only provides process.env.
declare var process: { env: NodeJS.ProcessEnv };
