import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
  Platform,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  usePlayVideoWithId,
  getPlayVideoWithID,
  useTrackEpisodeView,
  useMoviesDataById,
} from '../api/video';
import { useQueryClient } from '@tanstack/react-query';
import VideoPlayer from '../components/VideoPlayer';
import { useVideoStore } from '../store/videoStore';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { capitalizeWords } from '../utils/capitalizeWords';

type RootStackParamList = {
  Creator: { id: string };
  Video: {
    id: string;
    episodeId: string;
    posterUrl?: string;
  };
};

type Episode = {
  id: string;
  episodeNo: number;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  videoUrl: string;
  isPublic?: boolean;
  locked?: boolean;
};

const { width, height: windowHeight } = Dimensions.get('window');

const VideoListItem = React.memo(
  ({
    item,
    movie,
    onEpisodesPress,
    isAuthenticated,
    onVideoEnd,
  }: {
    item: any;
    movie: any;
    onEpisodesPress: () => void;
    isAuthenticated: boolean;
    onVideoEnd: () => void;
    posterUrl?: string;
  }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const [controlsVisible, setControlsVisible] = useState(false);

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: controlsVisible ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, [controlsVisible, fadeAnim]);

    const videoId = item && item?.id;
    const locked = item && !item?.isPublic && !isAuthenticated;
    const isPaidEpisode =
      !locked && item?.locked && movie?.isPaidSeries && !movie?.userPurchased;

    const hasExistingUrl = !!(item?.videoUrl && typeof item.videoUrl === 'string' && item.videoUrl.trim().length > 0);
    const shouldFetch = !locked && !isPaidEpisode && !!videoId && !hasExistingUrl;
    const { data, isLoading: isPlaybackLoading } = usePlayVideoWithId(
      shouldFetch ? videoId : null,
    );

    const episodeData =
      data?.episode && data?.episode?.videoUrl ? data?.episode : item;

    return (
      <View style={styles.videoContainer}>
        <VideoPlayer
          key={episodeData?.id}
          episode={episodeData}
          movie={movie}
          locked={locked}
          isPaidEpisode={isPaidEpisode}
          controlsVisible={controlsVisible}
          setControlsVisible={setControlsVisible}
          isPlaybackLoading={isPlaybackLoading}
          onVideoEnd={onVideoEnd}
        />
        <Animated.View
          style={[
            styles.overlay,
            {
              paddingBottom: insets.bottom + 10,
              opacity: locked || isPaidEpisode ? 1 : fadeAnim,
            },
          ]}
        >
          <View style={styles.leftOverlay}>
            <View>
              <View style={styles.userInfo}>
                <Image
                  source={{ uri: movie?.uploader?.profiles?.[0]?.avatarUrl }}
                  style={styles.avatar}
                />
                <Text
                  onPress={() =>
                    navigation.navigate('Creator', {
                      id: movie?.uploader?.id,
                    })
                  }
                  style={styles.username}
                >
                  {capitalizeWords(movie?.uploader?.name)}
                </Text>
              </View>
              <Text style={styles.title}>
                E{item.episodeNo}: {item.title}
              </Text>
              {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.rightOverlay}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.episodesButton}
              onPress={onEpisodesPress}
            >
              <Text style={styles.episodesButtonText}>Episodes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  },
);

const VideoScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Video'>>();

  const { id, episodeId, posterUrl } = route.params ?? {};
  const {
    series,
    episodes,
    setCurrentEpisodeId,
    currentEpisodeId,
    setPaused,
    setSeries,
    setEpisodes,
  } = useVideoStore();

  const { data: seriesData, isLoading: isSeriesLoading } = useMoviesDataById(id);
  const seriesFromData = seriesData?.series;

  const [isEpisodesSheetOpen, setIsEpisodesSheetOpen] = useState(false);

  const { isAuthenticated: globalAuth } = useAuthStore();
  const isAuthenticated = series?.isAuthenticated || globalAuth;

  const ITEM_HEIGHT = windowHeight;
  const flatListRef = useRef<FlatList>(null);

  const { mutate: trackView } = useTrackEpisodeView();

  useEffect(() => {
    if (seriesFromData) {
      if (!series || series.id !== seriesFromData.id) {
        setSeries(seriesFromData);
        if (seriesFromData.episodes?.length) {
          setEpisodes(seriesFromData.episodes);
        }
      }
    }
  }, [seriesFromData, series, setSeries, setEpisodes]);

  useEffect(() => {
    if (currentEpisodeId) {
      console.log(
        'VideoScreen: Triggering trackView for episode:',
        currentEpisodeId,
      );
      const payload: any = { episodeId: currentEpisodeId };
      if (!globalAuth) {
        payload.guestId = `guest-${Date.now()}`;
      }
      trackView(payload);
    }
  }, [currentEpisodeId, trackView, globalAuth]);

  useEffect(() => {
    if (episodes?.length > 0) {
      const isCurrentIdValid = episodes.some(ep => ep.id === currentEpisodeId);
      const targetEpisodeId = episodeId || (isCurrentIdValid ? currentEpisodeId : episodes[0].id);
      if (currentEpisodeId !== targetEpisodeId) {
        setCurrentEpisodeId(targetEpisodeId);
      }
    }
  }, [episodes, episodeId, currentEpisodeId, setCurrentEpisodeId]);

  const scrollToEpisode = useCallback(
    (index: number) => {
      try {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      } catch (e) {
        flatListRef.current?.scrollToOffset({
          offset: ITEM_HEIGHT * index,
          animated: true,
        });
      }
    },
    [ITEM_HEIGHT],
  );

  const handleEpisodeSelect = (episode: Episode, index: number) => {
    setCurrentEpisodeId(episode.id);
    scrollToEpisode(index);
    setIsEpisodesSheetOpen(false);
  };

  const handleCloseEpisodeBottomSheet = () => {
    setPaused(false);
    setIsEpisodesSheetOpen(false);
  };

  const handlePressOnEpisodes = useCallback(() => {
    setPaused(true);
    setIsEpisodesSheetOpen(true);
  }, [setPaused]);

  const queryClient = useQueryClient();

  const prefetchNextEpisode = useCallback(
    (nextIndex: number) => {
      if (nextIndex < episodes.length) {
        const nextEpisode = episodes[nextIndex];
        const locked = !nextEpisode?.isPublic && !isAuthenticated;
        const isPaidEpisode =
          !locked &&
          nextEpisode?.locked &&
          series?.isPaidSeries &&
          !series?.userPurchased;

        if (!locked && !isPaidEpisode) {
          queryClient.prefetchQuery({
            queryKey: ['playEpisode', nextEpisode.id],
            queryFn: () => getPlayVideoWithID(nextEpisode.id),
            staleTime: 1000 * 60 * 30,
          });
        }
      }
    },
    [episodes, isAuthenticated, series, queryClient],
  );

  const onViewableItemsChangedHandler = ({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const visibleItem = viewableItems[0];
      if (visibleItem.isViewable) {
        const currentIndex = visibleItem.index;
        setCurrentEpisodeId(visibleItem.item.id);
        prefetchNextEpisode(currentIndex + 1);
      }
    }
  };

  const onViewableItemsChangedRef = useRef(onViewableItemsChangedHandler);
  onViewableItemsChangedRef.current = onViewableItemsChangedHandler;

  const onViewableItemsChanged = useCallback((params: any) => {
    onViewableItemsChangedRef.current(params);
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const isCurrentIdValid = episodes?.some(ep => ep.id === currentEpisodeId);
  const targetEpisodeId = episodeId || (isCurrentIdValid ? currentEpisodeId : episodes?.[0]?.id);
  const validIndex = episodes?.findIndex(ep => ep.id === targetEpisodeId) ?? 0;
  const safeIndex = validIndex >= 0 ? validIndex : 0;

  const handleVideoEnd = useCallback(() => {
    if (!episodes || episodes.length === 0) return;
    const currentIndex = episodes.findIndex(ep => ep.id === currentEpisodeId);
    if (currentIndex !== -1) {
      const nextIndex = (currentIndex + 1) % episodes.length;
      scrollToEpisode(nextIndex);
    }
  }, [episodes, currentEpisodeId, scrollToEpisode]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <VideoListItem
        item={item}
        movie={series}
        onEpisodesPress={handlePressOnEpisodes}
        isAuthenticated={isAuthenticated}
        onVideoEnd={handleVideoEnd}
        posterUrl={posterUrl}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, isAuthenticated, handlePressOnEpisodes, handleVideoEnd, posterUrl],
  );

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!episodes || episodes.length === 0) return;
    if (isInitialMount.current) {
      requestAnimationFrame(() => scrollToEpisode(safeIndex));
      isInitialMount.current = false;
    }
  }, [episodes, safeIndex, scrollToEpisode]);

  if (isSeriesLoading && (!episodes || episodes.length === 0)) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#ff6a00" />
      </View>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.emptyText}>No episodes found.</Text>
      </View>
    );
  }

  const activeEpisode = episodes?.find(e => e.id === currentEpisodeId);
  return (
    <View style={[styles.container, { height: ITEM_HEIGHT }]}>
      <FlatList
        ref={flatListRef}
        data={episodes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        initialScrollIndex={safeIndex}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        snapToOffsets={episodes.map((_, i) => i * ITEM_HEIGHT)}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.85}
        snapToAlignment="start"
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === 'ios'}
        overScrollMode="never"
      />
      <EpisodesBottomSheet
        visible={isEpisodesSheetOpen}
        onClose={handleCloseEpisodeBottomSheet}
        episodes={episodes}
        activeEpisode={activeEpisode}
        onEpisodeSelect={handleEpisodeSelect}
        isAuthenticated={isAuthenticated}
        isPending={false}
        series={series}
        screenType="videoScreen"
        posterUrl={posterUrl}
      />
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: '#000',
  },
  emptyText: { color: 'white', fontSize: 16 },
  videoContainer: {
    width,
    height: windowHeight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    zIndex: 50,
    elevation: 50,
    pointerEvents: 'box-none',
  },
  leftOverlay: { flex: 1 },
  rightOverlay: { marginLeft: 16 },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'white',
    marginRight: 8,
  },
  username: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { color: 'white', fontSize: 14 },
  episodesButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  episodesButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
