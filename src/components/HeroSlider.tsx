import React from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useHeroSlider } from '../hooks/useHeroSlider';
import { SliderItem } from './SliderItem';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SLIDER_HEIGHT = SCREEN_HEIGHT * 0.62;

export default function HeroSlider({ isVisible = true }: { isVisible?: boolean }) {
  const {
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
  } = useHeroSlider();

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loaderContainer]}>
        <ActivityIndicator size="large" color="#ff6a00" />
      </View>
    );
  }

  if (!sliderData || sliderData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={sliderData}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id.toString()}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        renderItem={({ item, index }) => (
          <SliderItem
            item={item}
            isCurrentSlide={index === activeIndex}
            shouldPlay={index === activeIndex && isFocused && isVisible}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            onVideoEnd={handleVideoEnd}
            navigation={navigation}
          />
        )}
      />

      <View style={styles.dotsContainer}>
        {sliderData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === activeIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: SLIDER_HEIGHT,
    backgroundColor: '#000',
    position: 'relative',
  },
  loaderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 60,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#fff',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
});
