import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import { useVideoStore } from '../store/videoStore';
import { BufferingIndicator } from './videoPlayer/BufferingIndicator';
import { ErrorOverlay } from './videoPlayer/ErrorOverlay';
import { PlayerControls } from './videoPlayer/PlayerControls';
import { ProgressBar } from './videoPlayer/ProgressBar';
import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type VideoPlayerProps = {
  episode: { id: string; videoUrl: string; title: string; description: string };
  movie?: {
    posterUrl?: string;
  };
};

export default function VideoPlayer({ episode, movie }: VideoPlayerProps) {
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const bufferTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currentEpisodeId, isPaused, setPaused } = useVideoStore();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFocused = useIsFocused();

  const isVisible = currentEpisodeId === episode.id;
  const isPlaying = isVisible && !isPaused;

  useEffect(() => {
    return () => {
      if (bufferTimeout.current) {
        clearTimeout(bufferTimeout.current);
      }
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

  const handleBuffer = ({
    isBuffering: buffering,
  }: {
    isBuffering: boolean;
  }) => {
    if (bufferTimeout.current) {
      clearTimeout(bufferTimeout.current);
    }
    if (buffering) {
      bufferTimeout.current = setTimeout(() => {
        setIsBuffering(true);
      }, 200);
    } else {
      setIsBuffering(false);
    }
  };

  const handleProgress = (data: OnProgressData) => {
    if (!isBuffering && isPlaying) {
      setCurrentTime(data.currentTime);
      setProgress(data.currentTime / duration);
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
      setError('An error occurred while playing the video.');
      setIsBuffering(false);
      console.error('Video Error:', e);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const bufferConfig = {
    minBufferMs: 5000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      style={styles.container}
      onPress={() => setControlsVisible(!controlsVisible)}
    >
      {isVisible && (
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
      )}

      <View style={styles.overlayContainer}>
        {isBuffering && !error && isVisible && <BufferingIndicator />}
        {error && isVisible && <ErrorOverlay error={error} />}

        {controlsVisible && !isBuffering && !error && isVisible && (
          <PlayerControls onPressContainer={() => setControlsVisible(false)} />
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: width,
    height: height,
    backgroundColor: 'black',
    justifyContent: 'center',
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
});
