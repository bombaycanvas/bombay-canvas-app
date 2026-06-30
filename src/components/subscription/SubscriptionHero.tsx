import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import SubscriptionHeader from './SubscriptionHeader';
import SubscriptionProgress from './SubscriptionProgress';

interface SubscriptionHeroProps {
  series: any;
  onClose: () => void;
  paddingTop: number;
}

export default function SubscriptionHero({
  series,
  onClose,
  paddingTop,
}: SubscriptionHeroProps) {
  return (
    <View style={[styles.heroContainer, { paddingTop }]}>
      <Image
        source={require('../../images/subscription_creator.png')}
        style={styles.heroImage}
        resizeMode="cover"
      />

      <SubscriptionHeader onClose={onClose} />

      <View style={styles.heroContent}>
        <View style={styles.heroTextContainer}>
          <Text style={styles.heroTitle}>
            The story's{'\n'}
            <Text style={styles.heroTitleOrange}>not over yet.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Join Canvas to see how it ends and unlock thousands of creator-led stories.
          </Text>
        </View>

        <SubscriptionProgress
          series={series}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    position: 'relative',
    backgroundColor: '#000',
    overflow: 'hidden',
    paddingBottom: 20,
  },
  heroImage: {
    position: 'absolute',
    right: -20,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  heroContent: {
    zIndex: 2,
    paddingHorizontal: 16,
    marginTop: 10,
  },
  heroTextContainer: {
    width: '65%',
    marginBottom: 10,
  },
  episodesBadge: {
    fontSize: 11,
    color: '#ff6a00',
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  heroTitle: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 33,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  heroTitleOrange: {
    color: '#ff6a00',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#d2d0d0',
    marginTop: 8,
    lineHeight: 15,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
