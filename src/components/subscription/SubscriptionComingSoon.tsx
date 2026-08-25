import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from '@d11/react-native-fast-image';
import { imgUrl } from '../../api/video';

const CARD_GAP = 12;
const CARD_WIDTH = { screen: 120, sheet: 140 } as const;
const CARD_HEIGHT = { screen: 180, sheet: 210 } as const;

interface SubscriptionComingSoonProps {
  displayUpcoming: any[];
  // `sheet` drops the section chrome and outer margins so the cancel flow can own the heading.
  variant?: 'screen' | 'sheet';
}

export default function SubscriptionComingSoon({
  displayUpcoming,
  variant = 'screen',
}: SubscriptionComingSoonProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isSheet = variant === 'sheet';

  if (displayUpcoming.length === 0) return null;

  const cardWidth = CARD_WIDTH[variant];
  const cardHeight = CARD_HEIGHT[variant];
  const screenWidth = Dimensions.get('window').width;
  const totalContentWidth =
    displayUpcoming.length * cardWidth + (displayUpcoming.length - 1) * CARD_GAP;
  const scrollViewWidth = screenWidth - (isSheet ? 48 : 24);
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
    <View style={isSheet ? styles.sheetSection : styles.comingSoonSection}>
      {!isSheet && (
        <View style={styles.comingSoonHeader}>
          <Text style={styles.comingSoonTitle}>Coming Soon On Canvas</Text>
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={isSheet && styles.sheetScroll}
        contentContainerStyle={[styles.upcomingScroll, isSheet && styles.sheetScrollContent]}
        snapToInterval={cardWidth + CARD_GAP}
        decelerationRate="fast"
        snapToAlignment="start"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        nestedScrollEnabled={true}
      >
        {displayUpcoming.map((item: any, idx: number) => {
          const posterUrl = item.posterImage || item.posterUrl;
          const isMock = !posterUrl;
          const posterStyle = { width: cardWidth, height: cardHeight };
          return (
            <View key={item.id || idx} style={[styles.upcomingCard, { width: cardWidth }]}>
              {isMock ? (
                <LinearGradient
                  colors={['#222', '#111']}
                  style={[styles.upcomingMockPoster, posterStyle]}
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
                    uri: imgUrl(posterUrl, 320),
                    priority: FastImage.priority.normal,
                    cache: FastImage.cacheControl.immutable,
                  }}
                  style={[styles.upcomingPoster, posterStyle]}
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
            <View key={idx} style={[styles.pagerDot, activeIndex === idx && styles.pagerDotActive]} />
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
  sheetSection: {
    marginBottom: 4,
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
    gap: CARD_GAP,
  },
  // Bleed the carousel to the sheet edges so cards look like they scroll off-screen.
  sheetScroll: {
    marginHorizontal: -24,
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
  },
  upcomingCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    overflow: 'hidden',
  },
  upcomingPoster: {
    borderRadius: 14,
  },
  upcomingMockPoster: {
    borderRadius: 14,
    padding: 12,
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
    marginTop: 8,
    marginBottom: 6,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  pagerDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
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
