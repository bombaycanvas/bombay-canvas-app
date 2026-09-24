import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Share,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Volume2, VolumeX } from 'lucide-react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { imgUrl } from '../api/video';
import { capitalizeWords } from '../utils/capitalizeWords';
import EpisodesIcon from '../assets/EpisodesIcon';
import ShareIcon from '../assets/ShareIcon';

const FALLBACK_AVATAR =
  'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png';

interface RecommendationPostProps {
  item: any;
  navigation: any;
  isActive: boolean;
  // next reel: mount its player paused so it has buffered by the time it's swiped to
  shouldPreload: boolean;
  height: number;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onEpisodesPress: (item: any) => void;
}

const RecommendationPost: React.FC<RecommendationPostProps> = ({
  item,
  navigation,
  isActive,
  shouldPreload,
  height,
  isMuted,
  isPaused,
  onToggleMute,
  onEpisodesPress,
}) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [progress, setProgress] = useState(0);
  // width / height of a landscape trailer; null means portrait (full-bleed)
  const [landscapeRatio, setLandscapeRatio] = useState<number | null>(null);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const shouldMountVideo =
    !!item.trailerUrl && isFocused && (isActive || shouldPreload);
  const isPlaying = shouldMountVideo && isActive;

  useEffect(() => {
    if (!shouldMountVideo) {
      setIsVideoReady(false);
      setProgress(0);
      videoOpacity.setValue(0);
    }
  }, [shouldMountVideo, videoOpacity]);

  useEffect(() => {
    if (isVideoReady && isPlaying) {
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isVideoReady, isPlaying, videoOpacity]);

  const handleProgress = ({ currentTime, seekableDuration }: OnProgressData) => {
    if (seekableDuration > 0) {
      setProgress(Math.min(1, currentTime / seekableDuration));
    }
  };

  const handleLoad = ({ naturalSize }: OnLoadData) => {
    const { width: w, height: h, orientation } = naturalSize ?? {};
    if (!w || !h) return;
    // orientation accounts for rotation metadata, which can swap width/height
    const isLandscape = orientation ? orientation === 'landscape' : w > h;
    const ratio = Math.max(w, h) / Math.min(w, h);
    setLandscapeRatio(isLandscape ? ratio : null);
  };

  const handleWatchPress = () => {
    navigation.navigate('SeriesDetail', {
      id: item.id,
      posterUrl: item.posterUrl,
    });
  };

  const handleSharePress = async () => {
    try {
      const title = item.title || 'Bombay Canvas';
      const appLink = `https://www.canvasott.com/video/${item.id}`;
      const desc = item.description || '';

      await Share.share({
        message: `Watch ${title} on Bombay Canvas!\n\nOpen in App or Web: ${appLink}\n\n${desc}`,
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Share',
        text2: 'Failed to share this series',
      });
    }
  };

  const avatarUri = item.uploader?.profiles?.[0]?.avatarUrl;

  return (
    <View style={[styles.reel, { height }]}>
      <FastImage
        source={{
          uri: imgUrl(item.posterUrl, 640),
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {shouldMountVideo && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            landscapeRatio !== null && styles.landscapeStage,
            { opacity: videoOpacity },
          ]}
        >
          <Video
            source={{ uri: item.trailerUrl }}
            style={
              landscapeRatio !== null
                ? [styles.landscapeVideo, { aspectRatio: landscapeRatio }]
                : StyleSheet.absoluteFill
            }
            paused={!isPlaying || isPaused}
            resizeMode={landscapeRatio !== null ? 'contain' : 'cover'}
            repeat
            muted={isMuted}
            playWhenInactive={false}
            onLoad={handleLoad}
            onReadyForDisplay={() => setIsVideoReady(true)}
            onProgress={handleProgress}
            progressUpdateInterval={250}
            useTextureView={false}
            maxBitRate={2000000}
            bufferConfig={{
              minBufferMs: 2500,
              maxBufferMs: 5000,
              bufferForPlaybackMs: 500,
              bufferForPlaybackAfterRebufferMs: 2000,
            }}
          />
        </Animated.View>
      )}

      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)']}
        style={styles.topGradient}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,1)']}
        locations={[0, 0.5, 1]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {isPlaying && isVideoReady && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.muteButton, { top: insets.top + 12 }]}
          onPress={onToggleMute}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isMuted ? (
            <VolumeX color="white" size={20} />
          ) : (
            <Volume2 color="white" size={20} />
          )}
        </TouchableOpacity>
      )}

      <View style={styles.overlay}>
        <View style={styles.infoRow}>
          <View style={styles.leftOverlay}>
            <View style={styles.creatorRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.creatorPill}
                onPress={() =>
                  navigation.navigate('Creator', { id: item.uploader?.id })
                }
              >
                <FastImage
                  source={{
                    uri: avatarUri ? imgUrl(avatarUri, 100) : FALLBACK_AVATAR,
                  }}
                  style={styles.avatar}
                />
                <Text style={styles.username} numberOfLines={1}>
                  {capitalizeWords(item.uploader?.name)}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>

          <View style={styles.rightOverlay}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.rightActionBtn}
              onPress={() => onEpisodesPress(item)}
            >
              <EpisodesIcon size={Platform.OS === 'ios' ? 35 : 40} />
              <Text style={styles.actionText} numberOfLines={1}>
                Episodes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.rightActionBtn, styles.lastActionBtn]}
              onPress={handleSharePress}
            >
              <ShareIcon />
              <Text style={styles.actionText} numberOfLines={1}>
                Share
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.watchButton}
          onPress={handleWatchPress}
        >
          <Play
            style={styles.watchIcon}
            color="#ff6a00"
            size={18}
            fill="#ff6a00"
          />
          <Text style={styles.watchText}>Watch</Text>
        </TouchableOpacity>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  reel: {
    width: '100%',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  landscapeStage: {
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  landscapeVideo: {
    width: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
  muteButton: {
    position: 'absolute',
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 50,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    zIndex: 50,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  leftOverlay: { flex: 1 },
  rightOverlay: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  creatorRow: {
    marginBottom: 12,
  },
  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  username: { color: '#ff6a00', fontSize: 14, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { color: 'white', fontSize: 14, lineHeight: 19 },
  rightActionBtn: {
    alignItems: 'center',
    marginBottom: 20,
    width: 60,
  },
  lastActionBtn: {
    marginBottom: 0,
  },
  actionText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  watchIcon: { marginRight: 5 },
  watchText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '600',
  },
  progressTrack: {
    height: 3,
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6a00',
  },
});

export default memo(
  RecommendationPost,
  (prevProps, nextProps) =>
    prevProps.isActive === nextProps.isActive &&
    prevProps.shouldPreload === nextProps.shouldPreload &&
    prevProps.height === nextProps.height &&
    prevProps.isMuted === nextProps.isMuted &&
    prevProps.isPaused === nextProps.isPaused &&
    prevProps.onEpisodesPress === nextProps.onEpisodesPress &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.title === nextProps.item.title,
);