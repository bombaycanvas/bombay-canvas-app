import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { CastButton } from 'react-native-google-cast';

interface SeriesActionsProps {
  locked: boolean;
  isPaidEpisode: boolean;
  shouldFetch: boolean;
  isCasting: boolean;
  series: any;
  isPlaying: boolean;
  togglePlay: () => void;
  onUnlockPress: () => void;
  onPurchasePress: () => void;
  onWatchPress: () => void;
}

export const SeriesActions: React.FC<SeriesActionsProps> = ({
  locked,
  isPaidEpisode,
  shouldFetch,
  isCasting,
  series,
  isPlaying,
  togglePlay,
  onUnlockPress,
  onPurchasePress,
  onWatchPress,
}) => {
  return (
    <View style={styles.actionsRow}>
      {locked ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.watchButton}
          onPress={onUnlockPress}
        >
          <Text style={styles.watchText}>Unlock Episodes</Text>
        </TouchableOpacity>
      ) : isPaidEpisode ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.watchButton}
          onPress={onPurchasePress}
        >
          <Text style={styles.watchText}>Purchase Episodes</Text>
        </TouchableOpacity>
      ) : (
        shouldFetch && (
          <>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.watchButton,
                isCasting && styles.buttonDisabled,
              ]}
              disabled={isCasting}
              onPress={onWatchPress}
            >
              <Text style={styles.watchText}>Watch Now</Text>
            </TouchableOpacity>

            {series?.isTV && (
              <View style={styles.castButton}>
                <CastButton style={styles.castButtonContent as any} />
              </View>
            )}
          </>
        )
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.playPauseButton}
        onPress={togglePlay}
      >
        {isPlaying ? (
          <Pause color="#ff6a00" size={22} />
        ) : (
          <Play color="#ff6a00" size={22} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  watchButton: {
    flex: 1,
    backgroundColor: '#ff6a00',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  playPauseButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    padding: 12,
  },
  castButton: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 46,
    height: 46,
    overflow: 'hidden',
  },
  castButtonContent: {
    width: 46,
    height: 46,
    backgroundColor: 'transparent',
    tintColor: '#ff6a00',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
