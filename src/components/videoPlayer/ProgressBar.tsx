import React, { useState } from 'react';
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
  const [dragValue, setDragValue] = useState(progress);
  const [dragging, setDragging] = useState(false);

  return (
    <View
      style={[
        styles.bottomOverlay,
        {
          paddingBottom:
            Platform.OS === 'ios' ? insets.bottom : insets.bottom + 30,
        },
      ]}
    >
      <View style={styles.sliderContainer}>
        <Slider
          style={{ flex: 1 }}
          value={dragging ? dragValue : progress}
          minimumValue={0}
          maximumValue={1}
          onSlidingStart={() => setDragging(true)}
          onValueChange={val => setDragValue(val)}
          onSlidingComplete={val => {
            setDragging(false);
            onSeek(val);
          }}
          minimumTrackTintColor="#ff6a00"
          maximumTrackTintColor="#999"
          thumbTintColor="#fff"
        />
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
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
