import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { Volume2, VolumeX } from 'lucide-react-native';
import { useSliderItem } from '../hooks/useHeroSlider';
import { capitalizeWords } from '../utils/capitalizeWords';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_HEIGHT = SCREEN_HEIGHT * 0.62;

export interface SliderItemProps {
  item: any;
  isCurrentSlide: boolean;
  shouldPlay: boolean;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  onVideoEnd: () => void;
  navigation: any;
}

export const SliderItem = React.memo(({
  item,
  isCurrentSlide,
  shouldPlay,
  isMuted,
  setIsMuted,
  onVideoEnd,
  navigation,
}: SliderItemProps) => {
  const {
    isVideoReady,
    setIsVideoReady,
    videoOpacity,
    year,
    genre,
    episodesCount,
    rating,
  } = useSliderItem({ item, isCurrentSlide });

  return (
    <View style={styles.itemContainer}>
      <FastImage
        source={{
          uri: item.posterUrl || 'https://via.placeholder.com/600x800',
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        style={StyleSheet.absoluteFillObject}
        resizeMode={FastImage.resizeMode.cover}
      />

      {isCurrentSlide && item.trailerUrl ? (
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
          <Video
            source={{ uri: item.trailerUrl }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            paused={!shouldPlay}
            muted={isMuted}
            repeat={false}
            onReadyForDisplay={() => setIsVideoReady(true)}
            onEnd={onVideoEnd}
            playWhenInactive={false}
            useTextureView={Platform.OS === 'android'}
            maxBitRate={2000000}
            bufferConfig={{
              minBufferMs: 2500,
              maxBufferMs: 5000,
              bufferForPlaybackMs: 1000,
              bufferForPlaybackAfterRebufferMs: 2000,
            }}
          />
        </Animated.View>
      ) : null}

      <View style={styles.topOverlay}>
        <FastImage
          source={require('../images/MainLogo.png')}
          style={styles.logo}
          resizeMode={FastImage.resizeMode.contain}
        />

        {isCurrentSlide && item.trailerUrl && isVideoReady && (
          <TouchableOpacity
            style={styles.muteButton}
            onPress={() => setIsMuted(!isMuted)}
            activeOpacity={0.7}
          >
            {isMuted ? (
              <VolumeX color="white" size={16} />
            ) : (
              <Volume2 color="white" size={16} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)', '#000']}
        style={styles.gradient}
        start={{ x: 0.5, y: 0.15 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.contentOverlay}>
        <View style={styles.badgeRow}>
          {item.uploader?.profiles?.[0]?.avatarUrl ? (
            <FastImage
              source={{
                uri: item.uploader.profiles[0].avatarUrl,
                priority: FastImage.priority.high,
                cache: FastImage.cacheControl.immutable,
              }}
              style={styles.badgeAvatar}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeIconText}>C</Text>
            </View>
          )}
          <Text style={styles.badgeText}>
            {item.uploader?.name ? capitalizeWords(item.uploader.name) : 'Originals'}
          </Text>
        </View>

        <Text style={styles.titleText} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.watchNowBtn}
            onPress={() => {
              navigation.navigate('SeriesDetail', {
                id: item.id,
                posterUrl: item.posterUrl,
              });
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.watchNowText}>Watch Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.metadataText}>
          {year} • {genre} • {episodesCount} Episodes • {rating}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  itemContainer: {
    width: SCREEN_WIDTH,
    height: SLIDER_HEIGHT,
    position: 'relative',
    backgroundColor: '#000',
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  logo: {
    width: 70,
    height: 20,
  },
  muteButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 10,
  },
  contentOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 50,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  badgeAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  badgeIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  badgeIconText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },
  titleText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginTop: 18,
    marginBottom: 16,
  },
  watchNowBtn: {
    flex: 1,
    backgroundColor: '#ff6a00',
    height: 48,
    borderRadius: 10,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  watchNowText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  metadataText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
