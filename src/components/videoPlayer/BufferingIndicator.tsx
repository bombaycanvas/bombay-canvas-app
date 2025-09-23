import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

export const BufferingIndicator = () => (
  <ActivityIndicator
    size="large"
    color="white"
    style={styles.loadingIndicator}
  />
);

const styles = StyleSheet.create({
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
