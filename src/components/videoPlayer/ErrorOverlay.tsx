import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface ErrorOverlayProps {
  error: string;
}

export const ErrorOverlay = ({ error }: ErrorOverlayProps) => (
  <View style={styles.errorOverlay}>
    <AlertTriangle color="white" size={48} />
    <Text style={styles.errorText}>{error}</Text>
  </View>
);

const styles = StyleSheet.create({
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
