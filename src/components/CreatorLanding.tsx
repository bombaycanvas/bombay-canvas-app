import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from '@d11/react-native-fast-image';
import { Clapperboard, Play, Star } from 'lucide-react-native';
import { capitalizeWords } from '../utils/capitalizeWords';
import { useFlag } from '../api/settings';

const { height } = Dimensions.get('window');

interface CreatorLandingProps {
  data?: {
    creator: {
      id: string;
      name: string;
      profile?: {
        avatarUrl?: string;
        description?: string;
        posterUrl?: string;
      };
      stats?: {
        id?: string;
        creatorId?: string;
        avgViewsPerVideo?: number;
        totalViews?: number;
        manualShows?: number | null;
        manualRating?: number | null;
        createdAt?: string;
        updatedAt?: string;
      };
      socialLinks?: any[];
      showsCount?: number;
      totalViews?: number;
      avgRating?: number | null;
    };
    series: any[];
  };
}

const formatNumber = (num?: number): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const CreatorLanding: React.FC<CreatorLandingProps> = ({ data }) => {
  const showStatsBar = useFlag('creator.showStatsBar', true);
  const statShows = useFlag('creator.statShows', true);
  const statViews = useFlag('creator.statViews', true);
  const statRating = useFlag('creator.statRating', true);

  const creator = data?.creator;
  const uploaderName = creator?.name ?? '';
  const capitalizedName = capitalizeWords(uploaderName);
  const bgImage = creator?.profile?.posterUrl;
  const imageSource = bgImage
    ? { uri: bgImage, priority: FastImage.priority.high }
    : require('../assets/creatorCoverImage.png');
  const avatarImage =
    creator?.profile?.avatarUrl ||
    'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png';

  const showsVal =
    creator?.stats?.manualShows !== null && creator?.stats?.manualShows !== undefined
      ? creator.stats.manualShows
      : (creator?.showsCount ?? data?.series?.length ?? 0);

  const viewsVal =
    creator?.stats?.totalViews !== null && creator?.stats?.totalViews !== undefined
      ? creator.stats.totalViews
      : (creator?.totalViews ?? 0);


  const ratingVal =
    creator?.stats?.manualRating !== null && creator?.stats?.manualRating !== undefined
      ? creator.stats.manualRating
      : (creator?.avgRating ?? 0);

  return (
    <View style={styles.container}>
      <FastImage
        source={imageSource}
        style={StyleSheet.absoluteFillObject}
        resizeMode={FastImage.resizeMode.cover}
      />
      <LinearGradient
        colors={[
          'rgba(0, 0, 0, 0.3)',
          'rgba(74, 34, 5, 0.65)',
          'rgba(0, 0, 0, 0.95)',
        ]}
        locations={[0, 0.45, 0.9]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.content}>
        <FastImage
          source={{ uri: avatarImage, priority: FastImage.priority.high }}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />

        <Text style={styles.mainTitle}>{capitalizedName || 'Creator'}</Text>

        {creator?.profile?.description ? (
          <Text style={styles.para}>{creator.profile.description}</Text>
        ) : null}

        {showStatsBar && (statShows || statViews || statRating) ? (
          <View style={styles.statsContainer}>
            {statShows ? (
              <View style={styles.statCard}>
                <Clapperboard color="#ff6a00" size={18} style={styles.statIcon} />
                <Text style={styles.statValue}>{formatNumber(showsVal)}</Text>
                <Text style={styles.statLabel}>Shows</Text>
              </View>
            ) : null}

            {statViews ? (
              <View style={styles.statCard}>
                <Play color="#ff6a00" size={18} style={styles.statIcon} />
                <Text style={styles.statValue}>{formatNumber(viewsVal)}</Text>
                <Text style={styles.statLabel}>Total Views</Text>
              </View>
            ) : null}

            {statRating ? (
              <View style={styles.statCard}>
                <Star color="#ff6a00" size={18} style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {ratingVal !== null && ratingVal !== undefined ? Number(ratingVal).toFixed(1) : '0.0'}
                </Text>
                <Text style={styles.statLabel}>Average Rating</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default CreatorLanding;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: height * 0.58,
    justifyContent: 'flex-end',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 25,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
    marginBottom: 15,
  },
  mainTitle: {
    fontSize: 26,
    color: '#fff',
    marginBottom: 8,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  para: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    maxWidth: 320,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: '400',
    lineHeight: 18,
    marginBottom: 25,
  },
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    marginTop: 5,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.55)',
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
});
