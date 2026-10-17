import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Without prices the plan cards stay unpriced and their buy buttons inert —
// a dead paywall unless the screen says why. Both rails can land here: a failed
// GET /plans on Razorpay, a failed App Store catalogue on Apple.
/** Shown when the paywall's prices could not be loaded, with a way to retry. */
export default function PlansUnavailableNotice({
  onRetry,
  retrying,
}: {
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Couldn&apos;t load prices</Text>
      <Text style={styles.body}>Check your connection and try again.</Text>
      <TouchableOpacity
        style={[styles.button, retrying && styles.buttonDisabled]}
        onPress={onRetry}
        disabled={retrying}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {retrying ? 'Loading…' : 'Try again'}
        </Text>
      </TouchableOpacity>
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
    marginBottom: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  button: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffb066',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffb066',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
