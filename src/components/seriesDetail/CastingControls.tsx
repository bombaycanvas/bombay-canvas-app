import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SkipBack, SkipForward, Play, Pause } from 'lucide-react-native';

interface CastingControlsProps {
  previous: () => void;
  next: () => void;
  play: () => void;
  pause: () => void;
  playerState: any;
  MediaPlayerState: any;
}

export const CastingControls: React.FC<CastingControlsProps> = ({
  previous,
  next,
  play,
  pause,
  playerState,
  MediaPlayerState,
}) => {
  const isPlayingOrBuffering =
    playerState === MediaPlayerState.PLAYING ||
    playerState === MediaPlayerState.BUFFERING;

  return (
    <View style={styles.castingControlsContainer}>
      <Text style={styles.castingStatusText}>Casting to TV</Text>
      <View style={styles.castingButtonsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.castControlButton}
          onPress={previous}
        >
          <SkipBack color="#fff" size={28} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.castControlButton, styles.playPauseCastButton]}
          onPress={() => {
            if (isPlayingOrBuffering) {
              pause();
            } else {
              play();
            }
          }}
        >
          {isPlayingOrBuffering ? (
            <Pause color="#000" size={32} fill="#000" />
          ) : (
            <Play color="#000" size={32} fill="#000" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.castControlButton}
          onPress={next}
        >
          <SkipForward color="#fff" size={28} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  castingControlsContainer: {
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  castingStatusText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  castingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  castControlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseCastButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff6a00',
  },
});
