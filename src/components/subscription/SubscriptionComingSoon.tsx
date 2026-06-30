import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from '@d11/react-native-fast-image';

interface SubscriptionComingSoonProps {
  displayUpcoming: any[];
}

export default function SubscriptionComingSoon({ displayUpcoming }: SubscriptionComingSoonProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (displayUpcoming.length === 0) return null;

  const screenWidth = Dimensions.get('window').width;
  const totalContentWidth = displayUpcoming.length * 100 + (displayUpcoming.length - 1) * 10;
  const scrollViewWidth = screenWidth - 24;
  const showDots = displayUpcoming.length > 1 && totalContentWidth > scrollViewWidth;

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const offsetX = contentOffset.x;
    const maxOffsetX = contentSize.width - layoutMeasurement.width;

    if (maxOffsetX <= 0) {
      setActiveIndex(0);
      return;
    }

    const percentage = Math.max(0, Math.min(offsetX / maxOffsetX, 1));
    const index = Math.round(percentage * (displayUpcoming.length - 1));
    setActiveIndex(index);
  };

  return (
    <View style={styles.comingSoonSection}>
      <View style={styles.comingSoonHeader}>
        <Text style={styles.comingSoonTitle}>Coming Soon On Canvas</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.upcomingScroll}
        snapToInterval={110}
        decelerationRate="fast"
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        nestedScrollEnabled={true}
      >
        {displayUpcoming.map((item: any, idx: number) => {
          const posterUrl = item.posterImage || item.posterUrl;
          const isMock = !posterUrl;
          return (
            <View key={item.id || idx} style={styles.upcomingCard}>
              {isMock ? (
                <LinearGradient
                  colors={['#222', '#111']}
                  style={styles.upcomingMockPoster}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                >
                  <Text style={styles.upcomingMockSubtitle}>
                    {item.genres?.[0]?.name || 'UPCOMING'}
                  </Text>
                  <Text style={styles.upcomingMockTitle}>
                    {item.seriesName || item.title || 'Canvas Series'}
                  </Text>
                </LinearGradient>
              ) : (
                <FastImage
                  source={{
                    uri: posterUrl,
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable,
                  }}
                  style={styles.upcomingPoster}
                  resizeMode={FastImage.resizeMode.cover}
                />
              )}
              <Text style={styles.comingSoonBadgeText}>Coming Soon</Text>
            </View>
          );
        })}
      </ScrollView>

      {showDots && (
        <View style={styles.pagerDotsContainer}>
          {displayUpcoming.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.pagerDot,
                activeIndex === idx && styles.pagerDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  comingSoonSection: {
    marginHorizontal: 12,
    marginBottom: 20,
  },
  comingSoonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  comingSoonTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  upcomingScroll: {
    gap: 10,
  },
  upcomingCard: {
    width: 120,
    backgroundColor: '#111',
    borderRadius: 8,
    overflow: 'hidden',
  },
  upcomingPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
  },
  upcomingMockPoster: {
    width: 120,
    height: 180,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'flex-end',
  },
  upcomingMockSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
  },
  upcomingMockTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  comingSoonBadgeText: {
    color: '#ff6a00',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  pagerDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  pagerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#333',
  },
  pagerDotActive: {
    backgroundColor: '#ff6a00',
    width: 12,
  },
});
