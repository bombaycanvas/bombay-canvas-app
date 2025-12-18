import React from 'react';
import {
  Pressable,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Pause, Play } from 'lucide-react-native';
import { useVideoStore } from '../../store/videoStore';

interface PlayerControlsProps {
  onPressContainer: () => void;
}

export const PlayerControls = ({ onPressContainer }: PlayerControlsProps) => {
  const { isPaused, setPaused } = useVideoStore();

  return (
    <Pressable style={styles.controlsOverlay} onPress={onPressContainer}>
      <TouchableWithoutFeedback
        onPress={e => {
          e.stopPropagation();
          setPaused(!isPaused);
        }}
      >
        <View style={styles.playPauseButton}>
          {isPaused ? (
            <Play color="white" size={40} />
          ) : (
            <Pause color="white" size={40} />
          )}
        </View>
      </TouchableWithoutFeedback>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    padding: 10,
    backgroundColor: 'rgba(255,106,0,0.5)',
    borderRadius: 50,
  },
});
