import React from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { imgUrl } from '../../api/video';

const { height, width } = Dimensions.get('window');

interface VideoHeaderProps {
  series: any;
  currentEpisode: any;
  isFocused: boolean;
  videoOpacity: Animated.Value;
  videoRef: React.RefObject<any>;
  previewVideoUrl: string | undefined;
  isPlaying: boolean;
  isCasting: boolean;
  setIsReady: (ready: boolean) => void;
}

export const VideoHeader: React.FC<VideoHeaderProps> = ({
  series,
  currentEpisode,
  isFocused,
  videoOpacity,
  videoRef,
  previewVideoUrl,
  isPlaying,
  isCasting,
  setIsReady,
}) => {
  return (
    <View style={styles.videoWrapper}>
      {series && (
        <FastImage
          source={{
            uri: imgUrl(currentEpisode?.thumbnail || series.posterUrl, 640),
            priority: FastImage.priority.high,
          }}
          style={StyleSheet.absoluteFill}
          resizeMode={FastImage.resizeMode.cover}
        />
      )}
      {series && isFocused && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}
        >
          <Video
            useTextureView={false}
            ref={videoRef}
            source={previewVideoUrl ? { uri: previewVideoUrl } : undefined}
            style={styles.video}
            paused={!isPlaying || isCasting}
            resizeMode="cover"
            onReadyForDisplay={() => setIsReady(true)}
            poster={imgUrl(series?.posterUrl, 640)}
            posterResizeMode="cover"
            repeat
            playWhenInactive={true}
          />
        </Animated.View>
      )}
      <LinearGradient
        colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
        style={styles.gradient}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  videoWrapper: {
    position: 'absolute',
    width: width,
    height: height * 0.5,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    height: '45%',
    width: '100%',
  },
});
