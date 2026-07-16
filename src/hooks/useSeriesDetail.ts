import { useRef, useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { Animated } from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
  NavigationProp,
  useIsFocused,
} from '@react-navigation/native';
import { useMoviesDataById } from '../api/video';
import { useReviewManager } from './useReviewManager';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoStore } from '../store/videoStore';
import { useCastManager } from './useCastManager';

type RootStackParamList = {
  SeriesDetail: { id: string; posterUrl?: string };
  Video: {
    id: string;
    episodeId?: string;
    posterUrl?: string;
  };
};

type RootRedirectVideo = {
  Creator: { id: string };
  Video: { id: string; posterUrl?: string };
  Reviews: {
    seriesId: string;
    seriesTitle: string;
    posterUrl?: string;
    hasViewed: boolean;
  };
};

export const useSeriesDetail = () => {
  const insets = useSafeAreaInsets();
  const videoRef = useRef<any>(null);
  const navigation = useNavigation<NavigationProp<RootRedirectVideo>>();
  const queryClient = useQueryClient();
  const route = useRoute<RouteProp<RootStackParamList, 'SeriesDetail'>>();
  const params = route.params as any;
  const id = params?.id?.toString() || '';
  const posterUrl = params?.posterUrl;

  const { data, isLoading, isError, refetch } = useMoviesDataById(id);
  const {
    loadQueue,
    switchEpisode,
    isCasting,
    play,
    pause,
    next,
    previous,
    playerState,
    MediaPlayerState,
  } = useCastManager();
  const [isPlaying, setIsPlaying] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const {
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
    setSeries,
    setEpisodes,
    authRedirect,
    currentEpisodeId,
  } = useVideoStore();
  const [isEpisodesSheetOpen, setIsEpisodesSheetOpen] = useState(false);

  const [currentEpisode, setCurrentEpisode] = useState<any>(null);
  const series = data?.series;
  const previewEpisode = series?.episodes?.[0];
  const queueLoadedRef = useRef(false);

  const {
    reviewsData,
    isReviewsLoading,
    isReviewModalVisible,
    setIsReviewModalVisible,
    handleReviewSubmit,
    myReview,
    upsertReviewMutation,
  } = useReviewManager(id);

  const [isWatchRequiredModalVisible, setIsWatchRequiredModalVisible] = useState(false);

  const handleWatchNow = () => {
    setIsPlaying(false);
    setTimeout(() => {
      navigation.navigate('Video', {
        id,
        posterUrl,
      });
    }, 100);
  };

  const handleCommentPress = () => {
    if (!isAuthenticated) {
      setIsLockedVisibleModal(true);
      setAuthRedirect({
        screen: 'SeriesDetail',
        params: { id, posterUrl },
      });
      return;
    }

    const hasViewed = series?.episodes?.some(
      (ep: any) => ep.completed || (ep.progress !== undefined && ep.progress > 0)
    );

    if (!hasViewed) {
      setIsWatchRequiredModalVisible(true);
      return;
    }

    setIsReviewModalVisible(true);
  };

  useEffect(() => {
    if (series?.episodes?.length) {
      const matchedEpisode = currentEpisodeId
        ? series.episodes.find((ep: any) => ep.id === currentEpisodeId)
        : null;

      const defaultEpisode = series.episodes.find((ep: any) => !ep.completed) || series.episodes[0];

      if (matchedEpisode) {
        if (!currentEpisode || currentEpisode.id !== matchedEpisode.id) {
          setCurrentEpisode(matchedEpisode);
        } else {
          if (
            matchedEpisode.locked !== currentEpisode.locked ||
            matchedEpisode.videoUrl !== currentEpisode.videoUrl
          ) {
            setCurrentEpisode(matchedEpisode);
          }
        }
      } else {
        if (!currentEpisode) {
          setCurrentEpisode(defaultEpisode);
        } else {
          const updatedEpisode = series.episodes.find(
            (ep: any) => ep.id === currentEpisode.id,
          );
          if (updatedEpisode) {
            if (
              updatedEpisode.locked !== currentEpisode.locked ||
              updatedEpisode.videoUrl !== currentEpisode.videoUrl
            ) {
              setCurrentEpisode(updatedEpisode);
            }
          } else {
            setCurrentEpisode(defaultEpisode);
          }
        }
      }
    }
  }, [series, currentEpisodeId, currentEpisode]);

  const previewVideoUrl = previewEpisode?.videoUrl
    ? encodeURI(previewEpisode.videoUrl)
    : undefined;

  const videoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsReady(false);
    videoOpacity.setValue(0);
  }, [previewVideoUrl, videoOpacity]);

  useEffect(() => {
    if (isReady) {
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [isReady, videoOpacity]);

  const isFocused = useIsFocused();
  const { isAuthenticated: globalAuth } = useAuthStore();
  const isAuthenticated = data?.isAuthenticated || globalAuth;
  const locked =
    currentEpisode && !currentEpisode?.isPublic && !isAuthenticated;
  const isPaidEpisode =
    !locked &&
    currentEpisode?.locked &&
    series?.isPaidSeries &&
    !series?.userPurchased;
  const shouldFetch = !locked && !isPaidEpisode;

  useEffect(() => {
    if (!queueLoadedRef.current && isCasting && series && currentEpisode) {
      loadQueue(series, currentEpisode.id, isAuthenticated);
      queueLoadedRef.current = true;
    }

    if (!isCasting) {
      queueLoadedRef.current = false;
    }
  }, [isCasting, series, currentEpisode, loadQueue, isAuthenticated]);

  useEffect(() => {
    if (series) {
      setSeries(series);
      if (series.episodes?.length) {
        setEpisodes(series?.episodes);
      }
    }
  }, [series, setSeries, setEpisodes]);

  useEffect(() => {
    if (isCasting && series?.userPurchased && authRedirect?.params?.episodeId) {
      const purchasedEpisodeId = authRedirect.params.episodeId;
      loadQueue(series, purchasedEpisodeId, isAuthenticated);
      setAuthRedirect(null);
      console.log(
        'Post-purchase casting triggered for episode:',
        purchasedEpisodeId,
      );
    }
  }, [
    isCasting,
    series?.userPurchased,
    authRedirect,
    loadQueue,
    isAuthenticated,
    setAuthRedirect,
    series,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['seriesReviews', id] });
      return () => {
        setIsPlaying(false);
        setIsReady(false);
      };
    }, [refetch, queryClient, id]),
  );

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handleViewEpisodes = () => {
    setIsPlaying(false);
    setIsEpisodesSheetOpen(true);
  };

  return {
    insets,
    videoRef,
    navigation,
    id,
    posterUrl,
    data,
    isLoading,
    isError,
    refetch,
    loadQueue,
    switchEpisode,
    isCasting,
    play,
    pause,
    next,
    previous,
    playerState,
    MediaPlayerState,
    isPlaying,
    setIsPlaying,
    isReady,
    setIsReady,
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
    setSeries,
    setEpisodes,
    authRedirect,
    currentEpisodeId,
    isEpisodesSheetOpen,
    setIsEpisodesSheetOpen,
    currentEpisode,
    setCurrentEpisode,
    series,
    previewEpisode,
    reviewsData,
    isReviewsLoading,
    isReviewModalVisible,
    setIsReviewModalVisible,
    handleReviewSubmit,
    myReview,
    upsertReviewMutation,
    isWatchRequiredModalVisible,
    setIsWatchRequiredModalVisible,
    handleWatchNow,
    handleCommentPress,
    previewVideoUrl,
    videoOpacity,
    isFocused,
    isAuthenticated,
    locked,
    isPaidEpisode,
    shouldFetch,
    handleBack,
    togglePlay,
    handleViewEpisodes,
  };
};
