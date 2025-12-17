import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  View,
  Image,
  Animated,
  Platform,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useVideoStore } from '../store/videoStore';
import { BufferingIndicator } from './videoPlayer/BufferingIndicator';
import { ErrorOverlay } from './videoPlayer/ErrorOverlay';
import { PlayerControls } from './videoPlayer/PlayerControls';
import { ProgressBar } from './videoPlayer/ProgressBar';
import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type VideoPlayerProps = {
  episode: {
    id: string;
    videoUrl: string;
    title: string;
    description: string;
  };
  movie?: {
    posterUrl?: string;
  };
  locked: boolean;
  isPaidEpisode: boolean;
};

export default function VideoPlayer({
  episode,
  movie,
  locked = false,
  isPaidEpisode = false,
}: VideoPlayerProps) {
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const hideTimerRef = useRef<any>(null);
  const bufferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    currentEpisodeId,
    isPaused,
    setPaused,
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    controlsVisible,
    setControlsVisible,
  } = useVideoStore();

  const isVisible = currentEpisodeId === episode.id;
  const isFocused = useIsFocused();
  const isPlaying = isVisible && !isPaused;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: controlsVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, fadeAnim]);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, [setControlsVisible]);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);
      setError(null);
      setControlsVisible(false);
    }
  }, [isVisible, setControlsVisible]);

  useEffect(() => {
    if (!isFocused) {
      videoRef.current?.pause?.();
      setPaused(true);
    }
  }, [isFocused, setPaused]);

  useEffect(() => {
    if (episode && !locked && isVisible) {
      setTimeout(
        () => {
          setIsLockedVisibleModal(false);
        },
        Platform.OS === 'ios' ? 100 : 100,
      );
    } else if (episode && locked && isVisible) {
      setTimeout(
        () => {
          setIsLockedVisibleModal(true);
        },
        Platform.OS === 'ios' ? 100 : 100,
      );
    }
  }, [episode, locked, isVisible, setIsLockedVisibleModal]);

  useEffect(() => {
    if (episode && !locked && !isPaidEpisode && isVisible) {
      setTimeout(
        () => {
          setIsPurchaseModal(false);
          setPurchaseSeries(null);
        },
        Platform.OS === 'ios' ? 100 : 100,
      );
    } else if (episode && !locked && isPaidEpisode && isVisible) {
      setTimeout(
        () => {
          setIsPurchaseModal(true);
          setPurchaseSeries(movie);
        },
        Platform.OS === 'ios' ? 100 : 100,
      );
    }
  }, [
    episode,
    locked,
    isPaidEpisode,
    isVisible,
    setIsPurchaseModal,
    movie,
    setPurchaseSeries,
  ]);

  const handleBuffer = ({
    isBuffering: buffering,
  }: {
    isBuffering: boolean;
  }) => {
    if (bufferTimeout.current) clearTimeout(bufferTimeout.current);

    if (buffering) {
      bufferTimeout.current = setTimeout(() => setIsBuffering(true), 200);
    } else {
      setIsBuffering(false);
    }
  };

  const handleProgress = (data: OnProgressData) => {
    if (!isBuffering && isPlaying) {
      setCurrentTime(data.currentTime);
      setProgress(duration ? data.currentTime / duration : 0);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
    setError(null);
  };

  const handleLoadStart = () => {
    if (isVisible) {
      setIsBuffering(true);
      setError(null);
    }
  };

  const onSeek = (value: number) => {
    const newTime = value * duration;
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
    showControls();
  };

  const handleError = (e: any) => {
    if (isVisible) {
      setError('Failed to load video.');
      setIsBuffering(false);
      console.log('Video Error:', e);
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
  };

  const bufferConfig = {
    minBufferMs: 5000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
  };

  const onVideoTap = () => {
    if (!controlsVisible) {
      showControls();
    } else {
      setControlsVisible(false);
    }
    if (!locked && isPaidEpisode) {
      setPurchaseSeries(movie);
      setIsPurchaseModal(true);
      return;
    }
    if (locked) {
      setIsLockedVisibleModal(true);
      return;
    }
  };

  useEffect(() => {
    if (episode && isVisible && !isBuffering) showControls();
  }, [episode, isVisible, showControls, isBuffering]);

  const hasValidVideoUrl =
    episode?.videoUrl &&
    typeof episode.videoUrl === 'string' &&
    episode.videoUrl.trim().length > 0;

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={onVideoTap}
    >
      {isVisible && (locked || isPaidEpisode) ? (
        <Image
          source={{ uri: movie?.posterUrl }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <>
          {!locked && isVisible && hasValidVideoUrl ? (
            <Video
              ref={videoRef}
              source={{ uri: episode?.videoUrl }}
              style={styles.video}
              paused={!isPlaying}
              resizeMode="contain"
              onLoadStart={handleLoadStart}
              onLoad={handleLoad}
              onBuffer={handleBuffer}
              onProgress={handleProgress}
              onError={handleError}
              poster={movie?.posterUrl}
              posterResizeMode="cover"
              repeat
              bufferConfig={bufferConfig}
              progressUpdateInterval={250}
            />
          ) : (
            isVisible && (
              <View style={styles.missingVideoContainer}>
                <ErrorOverlay error="Video URL missing or invalid." />
              </View>
            )
          )}

          <Animated.View
            style={[styles.overlayContainer, { opacity: fadeAnim }]}
          >
            {isVisible && isBuffering && !error && <BufferingIndicator />}

            {isVisible && error && <ErrorOverlay error={error} />}

            {isVisible && controlsVisible && !isBuffering && !error && (
              <PlayerControls
                onPressContainer={() => setControlsVisible(false)}
              />
            )}

            {isVisible && (
              <ProgressBar
                progress={progress}
                duration={duration}
                currentTime={currentTime}
                onSeek={onSeek}
                formatTime={formatTime}
              />
            )}
          </Animated.View>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: 'black',
    justifyContent: 'center',
    maxHeight: height,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});
