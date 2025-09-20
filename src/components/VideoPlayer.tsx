import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Dimensions,
  Image,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Slider from '@react-native-community/slider';
import { Pause, Play, ChevronUp } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type VideoPlayerProps = {
  episode: { videoUrl: string; title: string; description: string };
  movie?: {
    posterUrl?: string;
    title?: string;
    uploader?: { name?: string; profiles?: { avatarUrl?: string }[] };
  };
  playing: boolean;
  setPlaying: (val: boolean) => void;
  onOpenEpisodes: () => void;
};

export default function VideoPlayer({
  episode,
  movie,
  playing,
  setPlaying,
  onOpenEpisodes,
}: VideoPlayerProps) {
  const videoRef = useRef(null);
  const bufferTimeout = useRef<null>(null);

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);

  useEffect(() => {
    return () => {
      if (bufferTimeout.current) {
        clearTimeout(bufferTimeout.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setPlaying(true);
      return () => {
        setPlaying(false);
      };
    }, [setPlaying]),
  );

  const handleBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    if (bufferTimeout.current) {
      clearTimeout(bufferTimeout.current);
    }

    if (isBuffering) {
      bufferTimeout.current = setTimeout(() => {
        setIsBuffering(true);
      }, 200);
    } else {
      setIsBuffering(false);
    }
  };

  const handleProgress = (data: OnProgressData) => {
    if (!isBuffering) {
      setCurrentTime(data.currentTime);
      setProgress(data.currentTime / duration);
    }
  };

  const handleLoad = (data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
  };

  const onSeek = (value: number) => {
    const newTime = value * duration;
    videoRef.current?.seek(newTime);
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const bufferConfig = {
    minBufferMs: 15000,
    maxBufferMs: 50000,
    bufferForPlaybackMs: 2500,
    bufferForPlaybackAfterRebufferMs: 5000,
  };

  return (
    <Pressable
      style={styles.container}
      onPress={() => setControlsVisible(!controlsVisible)}
    >
      <Video
        ref={videoRef}
        source={{ uri: episode?.videoUrl }}
        style={styles.video}
        paused={!playing}
        resizeMode="contain"
        onLoadStart={() => setIsBuffering(true)}
        onLoad={handleLoad}
        onBuffer={handleBuffer}
        onProgress={handleProgress}
        poster={movie?.posterUrl}
        posterResizeMode="cover"
        repeat
        bufferConfig={bufferConfig}
        progressUpdateInterval={250}
      />

      {isBuffering && (
        <ActivityIndicator
          size="large"
          color="white"
          style={styles.loadingIndicator}
        />
      )}

      {controlsVisible && !isBuffering && (
        <Pressable
          style={styles.controlsOverlay}
          onPress={() => setControlsVisible(false)}
        >
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={e => {
              e.stopPropagation();
              setPlaying(!playing);
            }}
          >
            {playing ? (
              <Pause color="white" size={60} />
            ) : (
              <Play color="white" size={60} />
            )}
          </TouchableOpacity>
        </Pressable>
      )}

      <View
        // colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomOverlay}
      >
        <View style={styles.bottomControls}>
          <View style={styles.textInfoContainer}>
            <Text style={styles.movieTitle}>{movie?.title}</Text>
            <Text style={styles.episodeTitle}>{episode?.title}</Text>
            <View style={styles.creatorInfo}>
              <Image
                source={{ uri: movie?.uploader?.profiles?.[0]?.avatarUrl }}
                style={styles.avatar}
              />
              <Text style={styles.creatorName}>{movie?.uploader?.name}</Text>
            </View>
          </View>
          <View style={styles.sliderContainer}>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={1}
              value={progress}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="#808080"
              thumbTintColor="#fff"
              onValueChange={onSeek}
            />
            <Text style={styles.timeText}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.sideControls}>
        <TouchableOpacity style={styles.sideButton} onPress={onOpenEpisodes}>
          <ChevronUp color="white" size={32} />
          <Text style={styles.sideButtonText}>Episodes</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
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
  },
  loadingIndicator: {
    ...StyleSheet.absoluteFillObject,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  playPauseButton: {},
  bottomOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
  },
  bottomControls: {
    flexDirection: 'column',
  },
  textInfoContainer: {
    marginBottom: 16,
  },
  movieTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  episodeTitle: {
    color: 'white',
    fontSize: 16,
    marginBottom: 8,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  creatorName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  sideControls: {
    position: 'absolute',
    right: 16,
    bottom: '25%',
    alignItems: 'center',
    gap: 24,
  },
  sideButton: {
    alignItems: 'center',
  },
  sideButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
});
