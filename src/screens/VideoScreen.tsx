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
  Share,
} from 'react-native';
import {
  usePlayVideoWithId,
  getPlayVideoWithID,
  useTrackEpisodeView,
  useMoviesDataById,
  imgUrl,
} from '../api/video';
import { useQueryClient } from '@tanstack/react-query';
import VideoPlayer from '../components/VideoPlayer';
import { useVideoStore } from '../store/videoStore';
import { useAuthStore } from '../store/authStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { capitalizeWords } from '../utils/capitalizeWords';
import { Heart } from 'lucide-react-native';
import { useToggleEpisodeLike } from '../api/engagement';
import Toast from 'react-native-toast-message';
import { useFlag } from '../api/settings';
import EpisodesIcon from '../assets/EpisodesIcon';
import ShareIcon from '../assets/ShareIcon';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { hasPlayableSource } from '../utils/videoSource';

type RootStackParamList = {
  Creator: { id: string };
  Video: {
    id: string;
    episodeId?: string;
    posterUrl?: string;
    ep?: string;
  };
};

type Episode = {
  id: string;
  episodeNo: number;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  videoUrl?: string | null;
  playbackUrl?: string | null;
  tvVideoUrl?: string | null;
  isPublic?: boolean;
  locked?: boolean;
};

const { width, height: windowHeight } = Dimensions.get('window');

const formatLikes = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return count.toString();
};

const VideoListItem = React.memo(
  ({
    item,
    movie,
    onEpisodesPress,
    isAuthenticated,
    onVideoEnd,
    posterUrl,
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

    // Any playable URL (HLS ladder, TV master or progressive MP4) is enough —
    // only refetch playback when the list payload carried none of them.
    const hasExistingUrl = hasPlayableSource(item, movie);
    const shouldFetch = !locked && !isPaidEpisode && !!videoId && !hasExistingUrl;
    const { data, isLoading: isPlaybackLoading } = usePlayVideoWithId(
      shouldFetch ? videoId : null,
    );

    const episodeData =
      data?.episode && hasPlayableSource(data.episode, movie)
        ? data.episode
        : item;

    const showLikes = useFlag('engagement.showLikes', true);
    const showLikeCount = useFlag('engagement.showLikeCount', false);

    const [liked, setLiked] = useState(!!episodeData?.likedByMe);
    const [likeCount, setLikeCount] = useState(episodeData?.likeCount ?? 0);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const { setAuthRedirect } = useVideoStore();
    const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);

    useEffect(() => {
      setLiked(!!episodeData?.likedByMe);
      setLikeCount(episodeData?.likeCount ?? 0);
    }, [episodeData?.likedByMe, episodeData?.likeCount]);

    const { mutate: toggleLike } = useToggleEpisodeLike(episodeData?.id, movie?.id);

    const handleLoginConfirm = () => {
      const redirectParams = {
        screen: 'Video',
        params: { id: movie?.id, episodeId: item?.id, posterUrl },
      };
      setAuthRedirect(redirectParams);
      (navigation as any).navigate('StartLogin', {
        redirect: redirectParams,
      });
    };

    const handleLikePress = () => {
      if (!isAuthenticated) {
        setIsLoginModalVisible(true);
        return;
      }

      const nextLiked = !liked;
      const nextLikeCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      setLiked(nextLiked);
      setLikeCount(nextLikeCount);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      toggleLike(undefined, {
        onError: (_err: any) => {
          setLiked(liked);
          setLikeCount(likeCount);
        },
        onSuccess: (resData: any) => {
          if (resData && typeof resData.liked === 'boolean') {
            setLiked(resData.liked);
            setLikeCount(resData.likeCount);
          }
        },
      });
    };

    const handleSharePress = async () => {
      try {
        const title = movie?.title || 'Bombay Canvas';
        const epNo = item?.episodeNo ? `E${item.episodeNo}` : '';
        const epTitle = item?.title ? `: ${item.title}` : '';
        const desc = item?.description || '';
        const appLink = `https://www.canvasott.com/video/${movie?.id}?ep=${item?.episodeNo}`;

        await Share.share({
          message: `Watch ${title} ${epNo}${epTitle} on Bombay Canvas!\n\nOpen in App or Web: ${appLink}\n\n${desc}`,
        });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Share',
          text2: 'Failed to share this episode',
        });
      }
    };

    const handleDoubleTapLike = () => {
      if (!isAuthenticated) {
        setIsLoginModalVisible(true);
        return false;
      }

      if (!liked) {
        setLiked(true);
        setLikeCount(likeCount + 1);

        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
        ]).start();

        toggleLike(undefined, {
          onError: (_err: any) => {
            setLiked(liked);
            setLikeCount(likeCount);
          },
          onSuccess: (resData: any) => {
            if (resData && typeof resData.liked === 'boolean') {
              setLiked(resData.liked);
              setLikeCount(resData.likeCount);
            }
          },
        });
      }
      return true;
    };

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
          onDoubleTap={handleDoubleTapLike}
        />

        <View
          style={[
            styles.overlay,
            {
              paddingBottom: insets.bottom + 10,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.leftOverlay,
              {
                opacity: locked || isPaidEpisode ? 1 : fadeAnim,
              },
            ]}
            pointerEvents={locked || isPaidEpisode || controlsVisible ? 'auto' : 'none'}
          >
            <View>
              <View style={styles.creatorRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.creatorPill}
                  onPress={() =>
                    navigation.navigate('Creator', {
                      id: movie?.uploader?.id,
                    })
                  }
                >
                  <Image
                    source={{ uri: imgUrl(movie?.uploader?.profiles?.[0]?.avatarUrl, 100) }}
                    style={styles.avatar}
                  />
                  <Text style={styles.username} numberOfLines={1}>
                    {capitalizeWords(movie?.uploader?.name)}
                  </Text>
                </TouchableOpacity>
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
          </Animated.View>
          <Animated.View
            style={[
              styles.rightOverlay,
              {
                opacity: locked || isPaidEpisode ? 1 : fadeAnim,
              },
            ]}
            pointerEvents={locked || isPaidEpisode || controlsVisible ? 'auto' : 'none'}
          >
            {showLikes ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.rightActionBtn}
                  onPress={handleLikePress}
                >
                  <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Heart
                      size={Platform.OS === 'ios' ? 32 : 35}
                      color={liked ? '#ff4d6d' : '#ffffff'}
                      fill={liked ? '#ff4d6d' : 'none'}
                    />
                  </Animated.View>
                  <Text style={[styles.actionText, liked && styles.likedText]} numberOfLines={1}>
                    {!showLikeCount || likeCount === 0 ? 'Likes' : formatLikes(likeCount)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.rightActionBtn}
                  onPress={onEpisodesPress}
                >
                  <EpisodesIcon size={Platform.OS === 'ios' ? 35 : 40} />
                  <Text style={styles.actionText} numberOfLines={1}>Episodes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.rightActionBtn}
                  onPress={handleSharePress}
                >
                  <ShareIcon />
                  <Text style={styles.actionText} numberOfLines={1}>Share</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.episodesPillBtn}
                onPress={onEpisodesPress}
              >
                <Text style={styles.episodesPillBtnText}>Episodes</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
        <ConfirmationModal
          visible={isLoginModalVisible}
          onClose={() => setIsLoginModalVisible(false)}
          onConfirm={handleLoginConfirm}
          title="Login Required"
          message="Please login to like this episode"
          confirmText="Log In"
          cancelText="Cancel"
        />
      </View>
    );
  },
);

const VideoScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Video'>>();

  const { id, episodeId: routeEpisodeId, posterUrl, ep } = route.params ?? {};
  const episodeId = routeEpisodeId || ep;
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

  const { mutate: trackView } = useTrackEpisodeView();
  const trackedEpisodeRef = useRef<string | null>(null);

  useEffect(() => {
    if (seriesFromData) {
      setSeries(seriesFromData);
      if (seriesFromData.episodes?.length) {
        setEpisodes(seriesFromData.episodes);
      }
    }
  }, [seriesFromData, setSeries, setEpisodes]);

  useEffect(() => {
    if (!currentEpisodeId) return;
    if (trackedEpisodeRef.current === currentEpisodeId) return;
    const episode = episodes?.find(ep => ep.id === currentEpisodeId);
    if (episode && !episode.isPublic && !isAuthenticated) return;

    trackedEpisodeRef.current = currentEpisodeId;
    trackView({ episodeId: currentEpisodeId });
  }, [currentEpisodeId, episodes, isAuthenticated, trackView]);

  const lastProcessedRoute = useRef<{ id: string; episodeId?: string } | null>(null);

  useEffect(() => {
    if (episodes?.length > 0) {
      const routeIdChanged = lastProcessedRoute.current?.id !== id;
      const routeEpisodeIdChanged = lastProcessedRoute.current?.episodeId !== episodeId;

      if (routeIdChanged || routeEpisodeIdChanged) {
        let resolvedEpisodeId = episodeId;
        if (episodeId) {
          const foundByUuid = episodes.some(ep => ep.id === episodeId);
          if (!foundByUuid) {
            const foundByNo = episodes.find(ep => ep.episodeNo === Number(episodeId));
            if (foundByNo) {
              resolvedEpisodeId = foundByNo.id;
            }
          }
        }

        const isCurrentIdValid = episodes.some(ep => ep.id === currentEpisodeId);
        const defaultEpisode = episodes.find((ep: any) => !ep.completed) || episodes[0];
        const targetEpisodeId = resolvedEpisodeId || (isCurrentIdValid ? currentEpisodeId : defaultEpisode.id);

        setCurrentEpisodeId(targetEpisodeId);
        lastProcessedRoute.current = { id, episodeId };

        const targetIndex = episodes.findIndex(ep => ep.id === targetEpisodeId);
        if (targetIndex !== -1) {
          requestAnimationFrame(() => scrollToEpisode(targetIndex));
        }
      }
    }
  }, [episodes, id, episodeId, setCurrentEpisodeId, scrollToEpisode, currentEpisodeId]);

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
  const defaultEpisode = episodes?.find((ep: any) => !ep.completed) || episodes?.[0];

  let resolvedEpisodeId = episodeId;
  if (episodeId && episodes?.length > 0) {
    const foundByUuid = episodes.some(ep => ep.id === episodeId);
    if (!foundByUuid) {
      const foundByNo = episodes.find(ep => ep.episodeNo === Number(episodeId));
      if (foundByNo) {
        resolvedEpisodeId = foundByNo.id;
      }
    }
  }

  const targetEpisodeId = resolvedEpisodeId || (isCurrentIdValid ? currentEpisodeId : defaultEpisode?.id);
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

  const activeEpisode =
    episodes?.find(e => e.id === currentEpisodeId) ||
    episodes?.find(e => e.id === targetEpisodeId);
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
  rightOverlay: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  creatorRow: {
    marginBottom: 12,
  },
  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  rightActionBtn: {
    alignItems: 'center',
    marginBottom: 20,
    width: 60,
  },
  actionText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'ios' ? 11 : 12,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  username: { color: '#ff6a00', fontSize: 14, fontWeight: 'bold' },
  likedText: {
    color: '#ff4d6d',
  },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { color: 'white', fontSize: 14 },
  episodesPillBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodesPillBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
