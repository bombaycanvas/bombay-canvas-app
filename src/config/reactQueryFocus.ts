import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Bridge React Native's AppState to React Query's focus notion.
//
// React Query's built-in focus detection is a browser `visibilitychange`
// listener, which never fires in React Native — so without this bridge the
// client is permanently "focused" and refetchOnWindowFocus is dead code on every
// query that asks for it.
//
// This matters most for payments. A UPI AutoPay mandate is approved in a
// DIFFERENT app: the user leaves, authorises, and comes back — which is exactly
// the moment their subscription state is most likely to have changed on the
// server and most likely to be stale on the device. Returning to the foreground
// is the strongest "your entitlement may have just changed" signal the app gets.
//
// Deliberately narrow: the query client's default is refetchOnWindowFocus:false,
// so this only wakes the queries that explicitly opt in (the entitlement
// authority queries). It is not a blanket refetch-everything-on-resume.
// ---------------------------------------------------------------------------

const onAppStateChange = (status: AppStateStatus) => {
  // 'active' is the only focused state. Android has no 'inactive', and web is
  // not a target here, so the check is a plain equality per the RN guidance in
  // the React Query docs.
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
};

const subscription = AppState.addEventListener('change', onAppStateChange);

// Seed the initial value: the module is imported during app start, when
// AppState.currentState is already meaningful. Without this the manager keeps
// its default until the FIRST background/foreground round trip.
onAppStateChange(AppState.currentState);

export default subscription;
