import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { FlatList, Animated, Dimensions } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useCarouselSeriesData } from '../api/video';
import { capitalizeWords } from '../utils/capitalizeWords';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Matches the web hero's rotation for slides that have no trailer to end on.
const POSTER_SLIDE_MS = 7000;

export function useHeroSlider({ isVisible = true }: { isVisible?: boolean } = {}) {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { data, isLoading } = useCarouselSeriesData();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Every admin-picked slide is shown; poster-only slides rotate on a timer.
  const sliderData = useMemo(() => data?.series || [], [data]);

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

  const activeHasTrailer = Boolean(sliderData[activeIndex]?.trailerUrl);
  useEffect(() => {
    if (activeHasTrailer || sliderData.length < 2 || !isFocused || !isVisible) {
      return;
    }
    const timer = setTimeout(handleVideoEnd, POSTER_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [activeHasTrailer, sliderData.length, isFocused, isVisible, handleVideoEnd]);

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
