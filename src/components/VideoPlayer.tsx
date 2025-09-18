import React, { useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Slider from '@react-native-community/slider';
import {
  Pause,
  Play,
  VolumeX,
  Volume2,
  Maximize,
  Minimize,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

type VideoPlayerProps = {
  episode: { videoUrl: string };
  movie?: { posterUrl?: string };
  playing: boolean;
  setPlaying: (val: boolean) => void;
};

export default function VideoPlayer({
  episode,
  movie,
  playing,
  setPlaying,
}: VideoPlayerProps) {
  const videoRef = useRef(null);

  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const togglePlay = () => {
    setPlaying(!playing);
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  const handleProgress = (data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    setProgress(data.currentTime / duration);
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
  };

  const seek = (seconds: number) => {
    const newTime = currentTime + seconds;
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <View style={[styles.container, { borderRadius: isFullscreen ? 0 : 20 }]}>
      <Video
        ref={videoRef}
        source={{ uri: episode?.videoUrl }}
        style={styles.video}
        paused={!playing}
        muted={muted}
        resizeMode={isFullscreen ? 'contain' : 'cover'}
        onProgress={handleProgress}
        onLoad={handleLoad}
        poster={movie?.posterUrl}
        posterResizeMode="cover"
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.sideButton, { left: screenWidth * 0.15 }]}
          onPress={() => seek(-10)}
        >
          <ChevronLeft color="white" size={32} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.centerButton} onPress={togglePlay}>
          {playing ? (
            <Pause color="white" size={50} />
          ) : (
            <Play color="white" size={50} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sideButton, { right: screenWidth * 0.15 }]}
          onPress={() => seek(10)}
        >
          <ChevronRight color="white" size={32} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.muteButton} onPress={toggleMute}>
          {muted ? (
            <VolumeX color="white" size={28} />
          ) : (
            <Volume2 color="white" size={28} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => setIsFullscreen(!isFullscreen)}
        >
          {isFullscreen ? (
            <Minimize color="white" size={24} />
          ) : (
            <Maximize color="white" size={24} />
          )}
        </TouchableOpacity>

        <View style={styles.bottomControls}>
          <Slider
            style={{ flex: 1 }}
            minimumValue={0}
            maximumValue={1}
            value={progress}
            minimumTrackTintColor="#fff"
            maximumTrackTintColor="#808080"
            thumbTintColor="#fff"
            onValueChange={val => {
              const newTime = val * duration;
              videoRef.current?.seek(newTime);
              setCurrentTime(newTime);
            }}
          />
          <Text style={styles.timeText}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 300,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: 'black',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  sideButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -16 }],
  },
  muteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  fullscreenButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
});
