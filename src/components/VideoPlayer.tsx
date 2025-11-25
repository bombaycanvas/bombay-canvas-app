import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  View,
  Image,
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
};

export default function VideoPlayer({
  episode,
  movie,
  locked,
}: VideoPlayerProps) {
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const bufferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentEpisodeId, isPaused, setPaused, setIsLockedVisibleModal } =
    useVideoStore();

  const isVisible = currentEpisodeId === episode.id;
  const isFocused = useIsFocused();
  const isPlaying = isVisible && !isPaused;

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      setIsBuffering(false);
      setError(null);
      setControlsVisible(false);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isFocused) {
      videoRef.current?.pause?.();
      setPaused(true);
    }
  }, [isFocused, setPaused]);

  useEffect(() => {
    if (locked && isVisible) {
      setIsLockedVisibleModal(true);
    } else {
      setIsLockedVisibleModal(false);
    }
  }, [locked, isVisible, setIsLockedVisibleModal]);

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

  const hasValidVideoUrl =
    episode?.videoUrl &&
    typeof episode.videoUrl === 'string' &&
    episode.videoUrl.trim().length > 0;

  const onVideoTap = () => {
    if (locked) {
      setIsLockedVisibleModal(true);
      return;
    }
    setControlsVisible(!controlsVisible);
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={onVideoTap}
    >
      {isVisible && locked ? (
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

          <View style={styles.overlayContainer}>
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
          </View>
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
