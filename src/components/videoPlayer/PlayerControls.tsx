import React from 'react';
import { TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { useVideoStore } from '../../store/videoStore';

interface PlayerControlsProps {
  onPressContainer: () => void;
}

export const PlayerControls = ({ onPressContainer }: PlayerControlsProps) => {
  const { isPaused, setPaused } = useVideoStore();

  return (
    <Pressable style={styles.controlsOverlay} onPress={onPressContainer}>
      <TouchableOpacity
        style={styles.playPauseButton}
        onPress={(e) => {
          e.stopPropagation();
          setPaused(!isPaused);
        }}
      >
        {!isPaused ? (
          <Pause color="white" size={60} />
        ) : (
          <Play color="white" size={60} />
        )}
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playPauseButton: {},
});
