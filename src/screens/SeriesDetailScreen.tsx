import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  NavigationProp,
} from '@react-navigation/native';
import { useMoviesDataById } from '../api/video';
import { ChevronLeft, Pause, Play } from 'lucide-react-native';
import FastImage from '@d11/react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { useVideoStore } from '../store/videoStore';
import { LoadingLogo } from '../components/LoadingLogo';

const { height, width } = Dimensions.get('window');

type RootStackParamList = {
  SeriesDetail: { id: string };
  Video: { id: string };
};

type RootRedirectVideo = {
  Creator: { id: string };
  Video: { id: string };
};

const SeriesDetailScreen = () => {
  const insets = useSafeAreaInsets();
  const videoRef = useRef(null);
  const navigation = useNavigation<NavigationProp<RootRedirectVideo>>();
  const route = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>();
  const { id } = route.params;
  const { data, isLoading, isError } = useMoviesDataById(id);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const {
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
  } = useVideoStore();
  const [isEpisodesSheetOpen, setIsEpisodesSheetOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const series = data?.series;
  const firstEpisode = series?.episodes?.[0];
  const { isAuthenticated: globalAuth } = useAuthStore();
  const isAuthenticated = data?.isAuthenticated || globalAuth;
  const locked = firstEpisode && !firstEpisode?.isPublic && !isAuthenticated;
  const isPaidEpisode =
    !locked &&
    firstEpisode?.locked &&
    series?.isPaidSeries &&
    !series?.userPurchased;
  const shouldFetch = !locked && !isPaidEpisode;

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      return () => {
        setIsPlaying(false);
      };
    }, []),
  );

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleViewEpisodes = () => {
    setIsPlaying(false);
    setIsEpisodesSheetOpen(true);
  };

  if (isError) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: 'white' }}>Error loading series.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
        <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
          <ChevronLeft color="#ff6a00" size={28} />
        </TouchableWithoutFeedback>
      </View>
      {series && (
        <>
          <View style={styles.videoWrapper}>
            <Video
              key={firstEpisode?.videoUrl}
              ref={videoRef}
              source={{ uri: firstEpisode?.videoUrl }}
              style={styles.video}
              paused={!isPlaying}
              resizeMode="cover"
              onReadyForDisplay={() => setIsReady(true)}
              poster={firstEpisode?.thumbnail}
              posterResizeMode="cover"
              repeat
            />
            {!isReady && (
              <FastImage
                source={{
                  uri: firstEpisode?.thumbnail,
                  priority: FastImage.priority.high,
                }}
                style={StyleSheet.absoluteFill}
                resizeMode={FastImage.resizeMode.cover}
              />
            )}
            <LinearGradient
              colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0)']}
              style={styles.gradient}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
            />
          </View>

          <ScrollView style={styles.details}>
            <Text style={styles.title}>{series.title}</Text>

            <View style={styles.actionsRow}>
              {locked ? (
                <TouchableWithoutFeedback
                  onPress={() => {
                    setIsLockedVisibleModal(true);
                    setAuthRedirect({ screen: 'SeriesDetail', params: { id } });
                  }}
                >
                  <View style={styles.watchButton}>
                    <Text style={styles.watchText}>Unlock Episodes</Text>
                  </View>
                </TouchableWithoutFeedback>
              ) : isPaidEpisode ? (
                <TouchableWithoutFeedback
                  onPress={() => {
                    setPurchaseSeries(series);
                    setIsPurchaseModal(true);
                  }}
                >
                  <View style={styles.watchButton}>
                    <Text style={styles.watchText}>Purchase Episodes</Text>
                  </View>
                </TouchableWithoutFeedback>
              ) : (
                shouldFetch && (
                  <TouchableWithoutFeedback
                    onPress={() => navigation.navigate('Video', { id })}
                  >
                    <View style={styles.watchButton}>
                      <Text style={styles.watchText}>Watch Now</Text>
                    </View>
                  </TouchableWithoutFeedback>
                )
              )}

              <TouchableWithoutFeedback onPress={togglePlay}>
                <View style={styles.playPauseButton}>
                  {isPlaying ? (
                    <Pause color="#ff6a00" size={22} />
                  ) : (
                    <Play color="#ff6a00" size={22} />
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>

            <Text style={styles.metaText}>
              {new Date(series.releaseDate).getFullYear()} •{' '}
              {series.genres?.[0]?.name.charAt(0).toUpperCase() +
                series.genres?.[0]?.name.slice(1).toLowerCase()}{' '}
              • {series.episodes?.length} Episodes
            </Text>

            {series.uploader && (
              <TouchableWithoutFeedback
                onPress={() =>
                  navigation.navigate('Creator', { id: series.uploader?.id })
                }
              >
                <View style={styles.creatorRow}>
                  <FastImage
                    source={{
                      uri:
                        series.uploader?.profiles?.[0]?.avatarUrl ||
                        'https://via.placeholder.com/40',
                      priority: FastImage.priority.normal,
                      cache: FastImage.cacheControl.immutable,
                    }}
                    style={styles.avatar}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                  <Text
                    style={styles.creatorName}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {series.uploader?.name}
                  </Text>
                </View>
              </TouchableWithoutFeedback>
            )}
            <Text
              style={styles.description}
              numberOfLines={5}
              ellipsizeMode="tail"
            >
              {series.description}
            </Text>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableWithoutFeedback onPress={handleViewEpisodes}>
              <View style={styles.episodesButton}>
                <Text style={styles.episodesButtonText}>View Episodes</Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </>
      )}

      {series && (
        <EpisodesBottomSheet
          visible={isEpisodesSheetOpen}
          onClose={() => setIsEpisodesSheetOpen(false)}
          episodes={series.episodes}
          activeEpisode={firstEpisode}
          onEpisodeSelect={() => {}}
          isAuthenticated={isAuthenticated}
          isPending={isLoading}
          series={series}
          screenType="seriesDetail"
        />
      )}
      {(showIntro || isLoading || !series) && (
        <View style={styles.loaderOverlay}>
          <LoadingLogo fullScreen />
        </View>
      )}
    </View>
  );
};

export default SeriesDetailScreen;

const styles = StyleSheet.create({
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingRight: 12,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.25)',
  },
  container: { flex: 1, backgroundColor: '#000' },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    zIndex: 999,
    justifyContent: 'center',
    padding: 12,
  },
  videoWrapper: {
    width: width,
    height: height * 0.5,
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  video: { width: '100%', height: '100%' },
  gradient: {
    position: 'absolute',
    bottom: 0,
    height: '45%',
    width: '100%',
  },
  loader: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#000',
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  creatorName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  description: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    backgroundColor: '#000',
    paddingTop: 10,
  },
  episodesButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  episodesButtonText: {
    color: '#ff6a00',
    fontSize: 16,
    fontWeight: '700',
  },
});
