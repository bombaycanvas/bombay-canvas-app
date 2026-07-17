import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { Play } from 'lucide-react-native';
import { useContinueWatching, imgUrl } from '../api/video';

export default function ContinueWatching() {
  const { data, isLoading, refetch } = useContinueWatching();
  const navigation = useNavigation<any>();

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const items = data?.items ?? [];

  if (isLoading || items.length === 0) {
    return null;
  }

  const handleCardPress = (item: any) => {
    navigation.navigate('Video', {
      id: item.seriesId,
      episodeId: item.episodeId,
      posterUrl: item.posterUrl,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Continue Watching</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item: any) => {
          const progressPct = item.progress ?? 0;
          return (
            <TouchableOpacity
              key={item.seriesId}
              activeOpacity={0.9}
              style={styles.card}
              onPress={() => handleCardPress(item)}
            >
              <FastImage
                source={
                  item.posterUrl
                    ? {
                      uri: imgUrl(item.posterUrl, 640),
                      priority: FastImage.priority.high,
                      cache: FastImage.cacheControl.immutable,
                    }
                    : { uri: '' }
                }
                style={styles.poster}
                resizeMode={FastImage.resizeMode.cover}
              />
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(0, progressPct))}%` },
                  ]}
                />
              </View>
              <View style={styles.info}>
                <View style={styles.resumeRow}>
                  <Play color="#ff9646" size={10} fill="#ff9646" />
                  <Text style={styles.resumeText}>Resume · Ep {item.episodeNo}</Text>
                </View>
                <Text style={styles.seriesName} numberOfLines={1}>
                  {item.seriesTitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: '500',
    marginBottom: 12,
  },
  scrollContent: {
    paddingRight: 20,
  },
  card: {
    width: 130,
    height: 195,
    marginRight: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 106, 0, 0.25)',
    position: 'relative',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 50,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff6a00',
  },
  info: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 50,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
  },
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resumeText: {
    color: '#ff9646',
    fontSize: 11,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: '600',
    marginLeft: 4,
  },
  seriesName: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Medium',
    marginTop: 2,
  },
});
