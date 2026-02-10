import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Dimensions,
  View,
  Image,
  Animated,
  TouchableOpacity,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useVideoStore } from '../store/videoStore';
import { BufferingIndicator } from './videoPlayer/BufferingIndicator';
import { ErrorOverlay } from './videoPlayer/ErrorOverlay';
import { PlayerControls } from './videoPlayer/PlayerControls';
import { ProgressBar } from './videoPlayer/ProgressBar';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

type VideoPlayerProps = {
  episode: {
    id: string;
    videoUrl: string;
    title: string;
    description: string;
  };
  movie?: {
    id?: string | number;
    posterUrl?: string;
  };
  locked: boolean;
  isPaidEpisode: boolean;
  controlsVisible?: boolean;
  setControlsVisible?: (visible: boolean) => void;
  isPlaybackLoading?: boolean;
  onVideoEnd?: () => void;
};

export default function VideoPlayer({
  episode,
  movie,
  locked = false,
  isPaidEpisode = false,
  controlsVisible: externalControlsVisible,
  setControlsVisible: externalSetControlsVisible,
  isPlaybackLoading = false,
  onVideoEnd,
}: VideoPlayerProps) {
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const isSeeking = useRef(false);
  const resumeAfterSeek = useRef(false);
  const hideTimerRef = useRef<any>(null);
  const bufferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingProgressBar = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const {
    currentEpisodeId,
    isPaused,
    setPaused,
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
  } = useVideoStore();

  const [internalControlsVisible, setInternalControlsVisible] = useState(false);
  const showDelayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const controlsVisible = externalControlsVisible ?? internalControlsVisible;
  const setControlsVisible =
    externalSetControlsVisible ?? setInternalControlsVisible;

  const isVisible = currentEpisodeId === episode.id;
  const isFocused = useIsFocused();
  const isPlaying = isVisible && !isPaused;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      setPaused(false);
    }
  }, [isVisible, setPaused]);

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

    if (!isDraggingProgressBar.current) {
      hideTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [setControlsVisible]);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);
      setIsReady(false);
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
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (!locked && !isPaidEpisode) {
        setIsLockedVisibleModal(false);
        setIsPurchaseModal(false);
        setPurchaseSeries(null);
        setAuthRedirect(null);
      } else if (locked) {
        setIsLockedVisibleModal(true);
        setAuthRedirect({
          screen: 'Video',
          params: {
            id: movie?.id,
            episodeId: episode?.id,
            posterUrl: movie?.posterUrl,
          },
        });
      } else if (isPaidEpisode) {
        setIsPurchaseModal(true);
        setPurchaseSeries(movie);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    episode,
    isVisible,
    locked,
    isPaidEpisode,
    movie,
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
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
    if (isSeeking.current || !isVisible) return;
    const current = data.currentTime;
    setCurrentTime(current);
    if (duration > 0) {
      setProgress(current / duration);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
    setIsReady(true);
    setError(null);
  };

  const handleLoadStart = () => {
    if (isVisible) {
      setIsBuffering(true);
      setError(null);
    }
  };

  const onSeek = useCallback(
    (value: number) => {
      if (!duration) return;
      const newTime = value * duration;
      isSeeking.current = true;
      if (!isPlaying) {
        resumeAfterSeek.current = true;
      }
      setIsBuffering(true);
      videoRef.current?.seek(newTime);
      setCurrentTime(newTime);
      setProgress(value);
      showControls();
    },
    [duration, isPlaying, showControls],
  );

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

  // const bufferConfig = {
  //   minBufferMs: 5000,
  //   maxBufferMs: 50000,
  //   bufferForPlaybackMs: 2500,
  //   bufferForPlaybackAfterRebufferMs: 5000,
  // };
  const bufferConfig = {
    minBufferMs: 1500,
    maxBufferMs: 30000,
    bufferForPlaybackMs: 500,
    bufferForPlaybackAfterRebufferMs: 1000,
  };

  const onVideoTap = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (showDelayTimer.current) {
      clearTimeout(showDelayTimer.current);
      showDelayTimer.current = null;
    }

    showDelayTimer.current = setTimeout(() => {
      if (controlsVisible) {
        setControlsVisible(false);
      } else {
        setControlsVisible(true);
        hideTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      }
    }, 300);

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

  if (!isVisible) return <View style={styles.container} />;
  return (
    <>
      <View style={styles.container}>
        {isVisible && (locked || isPaidEpisode || isPlaybackLoading) ? (
          <Pressable
            style={styles.posterContainer}
            onPress={onVideoTap}
            disabled={isPlaybackLoading}
          >
            <Image
              source={{ uri: movie?.posterUrl }}
              style={styles.poster}
              resizeMode="cover"
            />
            {isPlaybackLoading && (
              <View style={styles.loaderOverlay}>
                <BufferingIndicator />
              </View>
            )}
          </Pressable>
        ) : (
          <>
            {!locked && isVisible && hasValidVideoUrl ? (
              <Video
                useTextureView={true}
                key={episode?.videoUrl}
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
                onReadyForDisplay={() => setIsReady(true)}
                poster={movie?.posterUrl}
                posterResizeMode="cover"
                onEnd={onVideoEnd}
                bufferConfig={bufferConfig}
                progressUpdateInterval={250}
                onSeek={() => {
                  setIsBuffering(false);
                  requestAnimationFrame(() => {
                    if (resumeAfterSeek.current) {
                      setTimeout(() => {
                        setPaused(false);
                        resumeAfterSeek.current = false;
                      }, 50);
                    }

                    setTimeout(() => {
                      isSeeking.current = false;
                    }, 30);
                  });
                }}
              />
            ) : (
              isVisible &&
              !isPlaybackLoading && (
                <View style={styles.missingVideoContainer}>
                  <ErrorOverlay error="Video URL missing or invalid." />
                </View>
              )
            )}

            {isVisible && (
              <>
                {/* {(isBuffering || !isReady || isPlaybackLoading) && !error && (
                  <BufferingIndicator />
                )} */}
                {(isBuffering || !isReady || isPlaybackLoading) && !error && (
                  <BufferingIndicator />
                )}
                <Animated.View
                  style={[styles.overlayContainer, { opacity: fadeAnim }]}
                >
                  {controlsVisible && (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={[styles.backButton, { top: insets.top + 10 }]}
                      onPress={() => navigation.goBack()}
                    >
                      <ChevronLeft size={28} color="white" />
                    </TouchableOpacity>
                  )}

                  {error && <ErrorOverlay error={error} />}
                  {controlsVisible && !isBuffering && !error && (
                    <PlayerControls
                      onPressContainer={() => setControlsVisible(false)}
                    />
                  )}

                  <ProgressBar
                    progress={progress}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={onSeek}
                    formatTime={formatTime}
                    onToggleDragging={dragging => {
                      isDraggingProgressBar.current = dragging;
                      if (!dragging) {
                        showControls();
                      } else if (hideTimerRef.current) {
                        clearTimeout(hideTimerRef.current);
                      }
                    }}
                  />
                </Animated.View>
              </>
            )}
            {!controlsVisible && (
              <Pressable style={styles.tapLayer} onPress={onVideoTap}>
                <View />
              </Pressable>
            )}
          </>
        )}
      </View>
    </>
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
  posterContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 5,
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
    pointerEvents: 'box-none',
  },
  missingVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  backButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.01)',
    left: 0,
    zIndex: 20,
    padding: 12,
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
});
