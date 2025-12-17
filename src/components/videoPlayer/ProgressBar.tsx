import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProgressBarProps {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (value: number) => void;
  formatTime: (time: number) => string;
}

export const ProgressBar = ({
  progress,
  duration,
  currentTime,
  onSeek,
  formatTime,
}: ProgressBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomOverlay,
        {
          paddingBottom:
            Platform.OS === 'android' ? insets.bottom + 30 : insets.bottom,
        },
      ]}
    >
      <View style={styles.bottomControls}>
        <View style={styles.sliderContainer}>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="#808080"
            thumbTintColor="#fff"
            onValueChange={onSeek}
          />
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomOverlay: {
    position: 'absolute',
    bottom: 7,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  bottomControls: {
    flexDirection: 'column',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
});
