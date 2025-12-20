import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ProgressBarProps {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek: (value: number) => void;
  formatTime: (time: number) => string;
  onToggleDragging?: (dragging: boolean) => void;
}

export const ProgressBar = ({
  progress,
  duration,
  currentTime,
  onSeek,
  formatTime,
  onToggleDragging,
}: ProgressBarProps) => {
  const insets = useSafeAreaInsets();
  const [dragValue, setDragValue] = useState(progress);
  const [dragging, setDragging] = useState(false);
  const lastSeekTime = useRef(0);

  const displayValue =
    dragging || Date.now() - lastSeekTime.current < 1000 ? dragValue : progress;

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
          style={{ flex: 1, height: 40 }}
          value={displayValue}
          minimumValue={0}
          maximumValue={1}
          step={0.001}
          onSlidingStart={() => {
            setDragging(true);
            onToggleDragging?.(true);
          }}
          onValueChange={val => {
            setDragValue(val);
          }}
          onSlidingComplete={val => {
            lastSeekTime.current = Date.now();
            setDragValue(val);
            setDragging(false);
            onToggleDragging?.(false);
            onSeek(val);
          }}
          minimumTrackTintColor="#ff6a00"
          maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
          thumbTintColor="#ff6a00"
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
    bottom: Platform.OS === 'ios' ? 0 : 7,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Bold',
    minWidth: 70,
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
});
