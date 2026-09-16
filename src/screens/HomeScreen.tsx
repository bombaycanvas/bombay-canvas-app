import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import Explore from '../components/Explore';
import HeroSlider from '../components/HeroSlider';
import Landing from '../components/Landing';
import ContinueWatching from '../components/ContinueWatching';
import {
  useMoviesData,
  useRecommendedSeriesData,
  useGetCoverVideo,
  useCarouselSeriesData,
  imgUrl,
} from '../api/video';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { Crown } from 'lucide-react-native';
import { useMySubscription } from '../api/subscription';
import { useAuthStore } from '../store/authStore';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useLanguages } from '../api/language';
import { applyLanguagePreference, formatLanguageList } from '../utils/languageRank';
import { useSetting } from '../api/settings';

export default function HomeScreen() {
  const { data, isLoading } = useMoviesData();
  const { data: recommendedSeriesData, isLoading: isRecommendedLoading } =
    useRecommendedSeriesData();
  const { data: coverVideoData } = useGetCoverVideo();
  const { data: carouselData } = useCarouselSeriesData();
  const navigation = useNavigation<any>();
  const [isSliderVisible, setIsSliderVisible] = useState(true);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const { token, preferredLanguages } = useAuthStore();
  const { data: languages = [] } = useLanguages();
  const languageDisplayMode = useSetting('language.displayMode', 'RANK') as 'RANK' | 'FILTER';

  const { data: subscription, refetch } = useMySubscription();
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );
  const isActive = subscription &&
    (subscription.status === 'ACTIVE' ||
      subscription.status === 'PENDING' ||
      subscription.status === 'TRIAL' ||
      subscription.status === 'CANCELLED') &&
    subscription.currentPeriodEnd &&
    new Date(subscription.currentPeriodEnd) > new Date();

  const handleScroll = (event: any) => {
    const yOffset = event.nativeEvent.contentOffset.y;
    setIsSliderVisible(yOffset < 200);
  };
  useEffect(() => {
    const urlsToPreload: string[] = [];
    if (data?.series) {
      data.series.slice(0, 5).forEach(movie => {
        if (movie.posterUrl) {
          urlsToPreload.push(imgUrl(movie.posterUrl, 640));
        }
        if (movie.uploader?.profiles?.[0]?.avatarUrl) {
          urlsToPreload.push(imgUrl(movie.uploader.profiles[0].avatarUrl, 100));
        }
      });
    }

    if (recommendedSeriesData?.series) {
      recommendedSeriesData.series.slice(0, 5).forEach(movie => {
        if (movie.posterUrl) {
          urlsToPreload.push(imgUrl(movie.posterUrl, 640));
        }
        if (movie.uploader?.profiles?.[0]?.avatarUrl) {
          urlsToPreload.push(imgUrl(movie.uploader.profiles[0].avatarUrl, 100));
        }
      });
    }

    if (coverVideoData?.admin?.profiles?.[0]?.avatarUrl) {
      urlsToPreload.push(imgUrl(coverVideoData.admin.profiles[0].avatarUrl, 100));
    }

    if (urlsToPreload.length > 0) {
      const uniqueUrls = Array.from(new Set(urlsToPreload)).map(uri => ({
        uri,
        priority: FastImage.priority.low,
        cache: FastImage.cacheControl.immutable,
      }));
      FastImage.preload(uniqueUrls);
    }
  }, [data, recommendedSeriesData, coverVideoData]);

  const getMoviesByGenre = (series: any[]) => {
    const genreMap: Record<string, any[]> = {};
    series?.forEach(movie => {
      movie.genres?.forEach((genre: { name: string }) => {
        if (!genreMap[genre.name]) genreMap[genre.name] = [];
        genreMap[genre.name].push(movie);
      });
    });
    return genreMap;
  };

  // Apply once; genre buckets are then derived from the same processed list so
  // FILTER mode actually removes non-preferred-language series from every
  // genre row too, not just "New on canvas".
  const languageProcessedSeries = useMemo(
    () => applyLanguagePreference(data?.series ?? [], preferredLanguages, languageDisplayMode),
    [data?.series, preferredLanguages, languageDisplayMode],
  );

  const genreMap = useMemo(
    () => getMoviesByGenre(languageProcessedSeries),
    [languageProcessedSeries],
  );

  const rankedLatest = languageProcessedSeries;

  const rankedRecommended = useMemo(
    () => applyLanguagePreference(recommendedSeriesData?.series ?? [], preferredLanguages, languageDisplayMode),
    [recommendedSeriesData?.series, preferredLanguages, languageDisplayMode],
  );

  const onCardPress = (movie: any) => {
    navigation.navigate('SeriesDetail', {
      id: movie.id,
      posterUrl: movie.posterUrl,
    });
  };
  return (
    <View style={styles.container}>
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {(carouselData?.series && carouselData?.series?.length > 0) ? (
          <HeroSlider isVisible={isSliderVisible} />
        ) : (
          <Landing />
        )}
        <ContinueWatching />

        <Explore
          heading={'Recommended for you'}
          movieData={rankedRecommended}
          isLoading={isRecommendedLoading}
          onCardPress={onCardPress}
          emptyMessage={
            languageDisplayMode === 'FILTER' && preferredLanguages?.length
              ? 'No recommended titles in your preferred language yet.'
              : 'No recommendations yet.'
          }
        />
        <Explore
          heading={'New on canvas'}
          movieData={rankedLatest}
          isLoading={isLoading}
          onCardPress={onCardPress}
          emptyMessage={
            languageDisplayMode === 'FILTER' && preferredLanguages?.length
              ? 'No new titles in your preferred language yet.'
              : 'No new titles yet.'
          }
        />
        {Object.entries(genreMap)?.map(([genreName, movies]) => (
          <Explore
            key={genreName}
            heading={genreName}
            movieData={movies}
            isLoading={isLoading}
            onCardPress={onCardPress}
            emptyMessage="No titles in your preferred language for this genre yet."
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.stickyButton, isActive && styles.stickyButtonActive]}
        onPress={() => {
          if (!token) {
            setIsLoginModalVisible(true);
            return;
          }
          if (!isActive) {
            navigation.navigate('SubscriptionScreen', { fromGeneral: true });
          }
        }}
        activeOpacity={isActive ? 1 : 0.8}
      >
        <Crown color={isActive ? '#4cd964' : '#ff6a00'} size={16} fill={isActive ? '#4cd964' : '#ff6a00'} />
        <Text style={[styles.stickyText, isActive && styles.stickyTextActive]}>
          {isActive ? 'Active' : 'Subscribe'}
        </Text>
      </TouchableOpacity>

      <ConfirmationModal
        visible={isLoginModalVisible}
        onClose={() => setIsLoginModalVisible(false)}
        onConfirm={() => {
          setIsLoginModalVisible(false);
          navigation.navigate('StartLogin');
        }}
        title="Login Required"
        message="Please login to subscribe to premium plans"
        confirmText="Log In"
        cancelText="Cancel"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  stickyButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 40,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 20, 20, 0.85)',
    borderRadius: 24,
    paddingVertical: Platform.OS === 'ios' ? 5 : 8,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#ff6a00',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 9999,
  },
  stickyButtonActive: {
    borderColor: '#4cd964',
  },
  stickyText: {
    color: '#ff6a00',
    fontSize: 13,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  stickyTextActive: {
    color: '#4cd964',
  },
});
