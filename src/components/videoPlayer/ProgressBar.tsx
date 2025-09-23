import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

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
}: ProgressBarProps) => (
  <View style={styles.bottomOverlay}>
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

const styles = StyleSheet.create({
  bottomOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  bottomControls: {
    flexDirection: 'column',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
});
