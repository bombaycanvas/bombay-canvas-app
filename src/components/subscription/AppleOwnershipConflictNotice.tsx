import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Deliberately not a dead end. The user has done nothing wrong — they signed
// into a second Canvas account on a device whose Apple ID already carries the
// subscription — so the copy has to name the cause and give the ways out rather
// than just refusing. Every route offered here is one the user can take on their
// own: sign back into the account that holds it, restore (the button directly
// below this notice), or ask Apple for a refund if the charge already happened.
//
// It stops short of promising a transfer. There is no tool that moves a
// subscription between Canvas accounts today, and a promise support cannot keep
// turns a clear refusal into a wait that ends the same way. This matches what
// the App Store itself allows: Apple owns the money, so Apple owns the refund.
/** Shown when this Apple ID's subscription is bound to a different Canvas account. */
export default function AppleOwnershipConflictNotice() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Apple ID already has Canvas Premium</Text>
      <Text style={styles.body}>
        The App Store subscription on this device belongs to a different Canvas
        account, and Apple allows only one subscription per Apple ID. Buying
        again here would be charged without unlocking this account.
      </Text>
      <Text style={styles.body}>
        Sign in with the Canvas account that holds it, or tap Restore Purchases
        below if you believe it belongs to this one. If you were already
        charged, request a refund from Apple — subscriptions cannot be moved
        between Canvas accounts.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a3418',
    backgroundColor: '#1c1408',
  },
  title: {
    color: '#ffb066',
    fontSize: 15,
    marginBottom: 8,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  body: {
    color: '#c9c1b8',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
