import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export const BufferingIndicator = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="white" />
  </View>
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
});
