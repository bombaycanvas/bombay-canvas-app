import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { ChevronRight } from 'lucide-react-native';
import LockOutlined from '../../assets/LockOutlined';

interface SubscriptionProgressProps {
  series: any;
}

export default function SubscriptionProgress({
  series,
}: SubscriptionProgressProps) {
  const { lockStart, lockEnd } = useMemo(() => {
    if (!series?.episodes || series.episodes.length === 0) {
      return { lockStart: 1, lockEnd: 15 };
    }

    const episodes = series.episodes;
    let firstLocked = -1;
    let lastLocked = -1;

    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const isLocked = ep.locked || !ep.isPublic;
      if (isLocked) {
        if (firstLocked === -1) {
          firstLocked = ep.episodeNo || (i + 1);
        }
        lastLocked = ep.episodeNo || (i + 1);
      }
    }
    if (firstLocked === -1) {
      return { lockStart: Math.min(2, episodes.length), lockEnd: episodes.length };
    }

    return { lockStart: firstLocked, lockEnd: lastLocked };
  }, [series]);

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <FastImage
          source={{
            uri: series?.posterUrl || 'https://via.placeholder.com/150',
            priority: FastImage.priority.high,
            cache: FastImage.cacheControl.immutable,
          }}
          style={styles.progressThumb}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.progressDetails}>
          <Text style={styles.progressTitle} numberOfLines={1}>
            {series?.title}
          </Text>
          <View style={styles.lockRow}>
            <LockOutlined width={17} height={17} color="#fff" />
            <View style={styles.lockTextContainer}>
              <Text style={styles.lockTitle}>Episodes {lockStart} – {lockEnd}</Text>
              <Text style={styles.lockSubtitle}>Find out what happens next</Text>
            </View>
            <ChevronRight color="#fff" size={17} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressCard: {
    width: 300,
    backgroundColor: 'rgba(20, 20, 20, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  progressHeader: {
    flexDirection: 'row',
  },
  progressThumb: {
    width: 68,
    height: 92,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  progressDetails: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  progressTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  lockTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  lockTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  lockSubtitle: {
    color: '#d2d0d0',
    fontSize: 11,
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginTop: 2,
  },
});
