import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

const LoadingDiscovery = () => (
  <View style={styles.centeredLoading}>
    <ActivityIndicator size="large" color="#FF6A00" />
    <Text style={styles.loadingText}>Finding your matches...</Text>
  </View>
);

const styles = StyleSheet.create({
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#aaa',
    marginTop: 16,
    fontSize: 16,
  },
});

export default LoadingDiscovery;
