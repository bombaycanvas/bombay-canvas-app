import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

// ===========================================================================
// The window between the store taking the money and the server granting the
// entitlement is the one moment the user has paid and has nothing to show for
// it, so it gets its own screen and its own copy rather than an anonymous
// spinner.
//
// Shared because there are two ways into that window — buying from the paywall,
// and accepting the downsell on the way out of a trial — and a user who has just
// been charged should not be able to tell which code path they are in.
// ===========================================================================

/** `checkout` covers the payment sheet; `activating` covers the entitlement poll behind it. */
export type PurchasePhase = 'idle' | 'checkout' | 'activating';

export const ACTIVATING_MESSAGE =
  'Payment received. Activating your subscription — please keep the app open.';

/**
 * Renders nothing while idle, so callers can mount it unconditionally and drive
 * it from one piece of state.
 */
export default function SubscriptionActivatingOverlay({
  phase,
}: {
  phase: PurchasePhase;
}) {
  if (phase === 'idle') return null;

  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#ff6600" />
      {phase === 'activating' && (
        <Text style={styles.text}>{ACTIVATING_MESSAGE}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 40,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
