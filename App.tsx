import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import queryClient from './src/config/queryClient';
import MainApp from './src/navigation/MainApp';
import './src/config/reactQueryPersist';
import { IOS_CLIENT_ID, WEB_CLIENT_ID } from '@env';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  initErrorTracking,
  initMetaSdk,
  posthog,
} from './src/utils/analytics';
import { useAppleIapSync } from './src/hooks/useAppleIapSync';
import { PostHogProvider } from 'posthog-react-native';

// At module scope, not in an effect: an error thrown during the very first
// render happens before any effect runs.
initErrorTracking();

function AppleIapSync() {
  useAppleIapSync();
  return null;
}

export default function App() {
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      iosClientId: IOS_CLIENT_ID,
    });

    initMetaSdk().catch(err =>
      console.warn('[analytics] Meta SDK init failed', err),
    );
  }, []);

  return (
    <PostHogProvider
      // The client is built in `utils/analytics/posthog.ts`, not from an apiKey
      // prop here. Most tracking in this app fires from plain modules that no
      // React context can reach (the navigation container, the checkout hook,
      // the auth store), so the client has to exist at module scope. Passing it
      // in means `usePostHog()` inside components serves that SAME instance —
      // with an apiKey prop the provider would build a SECOND client, and the
      // two would keep separate sessions and disagree on distinct_id.
      client={posthog}
      // captureScreens MUST stay off. It defaults to ON, and it mounts a hook
      // that calls `useNavigationState()` — which throws unless it renders
      // INSIDE a NavigationContainer. This provider sits at the root of the
      // tree; the navigator lives further down, inside <MainApp />, so the hook
      // can never find it here ("Couldn't get the navigation state").
      //
      // Moving the provider below the navigator would satisfy the hook but is
      // still the wrong call: `routes.tsx` already reports every screen itself
      // (onReady + onStateChange -> track('PageView', { screen })), so
      // autocapture would double-count each one.
      //
      // NOT `autocapture={false}`: app lifecycle events (install / open /
      // update / background) are gated on autocapture not being `false`
      // outright, so the blunt switch would silently drop them too. Those are
      // the cheapest retention signal we get, so only screens are disabled.
      autocapture={{ captureScreens: false }}

      //temporary logging
      debug={__DEV__}
    >
      <QueryClientProvider client={queryClient}>
        <AppleIapSync />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <MainApp />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </PostHogProvider>
  );
}
