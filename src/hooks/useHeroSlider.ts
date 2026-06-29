import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FlatList, Animated, Dimensions } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useCarouselSeriesData } from '../api/video';
import { capitalizeWords } from '../utils/capitalizeWords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function useHeroSlider() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { data, isLoading } = useCarouselSeriesData();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  const sliderData = useMemo(() => {
    const seriesList = data?.series || [];
    const withTrailer = seriesList.filter((item: any) => item.trailerUrl);
    if (withTrailer.length > 0) {
      return withTrailer.slice(0, 5);
    }
    return seriesList.slice(0, 5);
  }, [data]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== null && index !== undefined) {
        setActiveIndex(index);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const handleVideoEnd = useCallback(() => {
    if (sliderData.length === 0) return;
    const nextIndex = (activeIndex + 1) % sliderData.length;
    try {
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } catch (e) {
      console.warn('Scroll to index failed:', e);
    }
  }, [activeIndex, sliderData.length]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);

  return {
    navigation,
    isFocused,
    isLoading,
    activeIndex,
    isMuted,
    setIsMuted,
    flatListRef,
    sliderData,
    onViewableItemsChanged,
    viewabilityConfig,
    handleVideoEnd,
    getItemLayout,
  };
}

export function useSliderItem({ item, isCurrentSlide }: { item: any; isCurrentSlide: boolean }) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isCurrentSlide) {
      setIsVideoReady(false);
      videoOpacity.setValue(0);
    }
  }, [isCurrentSlide, videoOpacity]);

  useEffect(() => {
    if (isVideoReady && isCurrentSlide) {
      Animated.timing(videoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [isVideoReady, isCurrentSlide, videoOpacity]);

  const year = item.releaseDate ? new Date(item.releaseDate).getFullYear() : '2026';
  const genre = capitalizeWords(item.genres?.[0]?.name || 'Original');
  const episodesCount = item.episodesCount || (item.episodes ? item.episodes.length : 0) || 8;
  const rating = item.classification || '16+';

  return {
    isVideoReady,
    setIsVideoReady,
    videoOpacity,
    year,
    genre,
    episodesCount,
    rating,
  };
}
