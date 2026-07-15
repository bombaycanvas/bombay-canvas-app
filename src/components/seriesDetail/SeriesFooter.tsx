import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface SeriesFooterProps {
  onPress: () => void;
  paddingBottom: number;
}

export const SeriesFooter: React.FC<SeriesFooterProps> = ({
  onPress,
  paddingBottom,
}) => {
  return (
    <View style={[styles.footer, { paddingBottom }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.episodesButton}
        onPress={onPress}
      >
        <Text style={styles.episodesButtonText}>View Episodes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  episodesButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  episodesButtonText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '700',
  },
});
