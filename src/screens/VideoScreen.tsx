import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useMoviesDataById, usePlayVideoWithId } from '../api/video';
import VideoPlayer from '../components/VideoPlayer';
import { useVideoStore } from '../store/videoStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';

type RootStackParamList = {
  Creator: { id: string };
  VideoScreen: { id: string; episodeId: string };
};

type Episode = {
  id: string;
  episodeNo: number;
  title: string;
  description: string;
  duration: number;
  thumbnail: string;
  videoUrl: string;
};

const { width, height: windowHeight } = Dimensions.get('window');

const VideoListItem = React.memo(
  ({
    item,
    movie,
    onEpisodesPress,
    isAuthenticated,
  }: {
    item: any;
    movie: any;
    onEpisodesPress: () => void;
    isAuthenticated: boolean;
  }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const videoId = item && item?.id;
    const locked = item && !item?.isPublic && !isAuthenticated;
    const isPaidEpisode =
      item.locked && movie?.isPaidSeries && !movie?.userPurchased;

    const shouldFetch = !locked && !isPaidEpisode && !!videoId;
    const { data } = usePlayVideoWithId(shouldFetch ? videoId : null);

    const episodeData =
      data?.episode && data.episode.videoUrl ? data.episode : item;

    return (
      <View style={styles.videoContainer}>
        <VideoPlayer
          episode={episodeData}
          movie={movie}
          locked={locked}
          isPaidEpisode={isPaidEpisode}
        />
        <View style={[styles.overlay, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.leftOverlay}>
            <View>
              <View style={styles.userInfo}>
                <Image
                  source={{ uri: movie?.uploader?.profiles?.[0]?.avatarUrl }}
                  style={styles.avatar}
                />
                <Text
                  onPress={() =>
                    navigation.navigate('Creator', {
                      id: movie?.uploader?.id,
                    })
                  }
                  style={styles.username}
                >
                  {movie?.uploader?.name}
                </Text>
              </View>
              <Text style={styles.title}>
                E{item.episodeNo}: {item.title}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          </View>
          <View style={styles.rightOverlay}>
            <TouchableOpacity
              onPress={onEpisodesPress}
              style={styles.episodesButton}
            >
              <Text style={styles.episodesButtonText}>Episodes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

const VideoScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'VideoScreen'>>();
  const { id, episodeId } = route.params ?? {};

  const { setEpisodes, setCurrentEpisodeId, currentEpisodeId } =
    useVideoStore();

  const { data, isLoading, isError } = useMoviesDataById(
    id ?? 'cmff99fyf0005s60esh5ndrws',
  );

  const series = data?.series;
  const episodes: Episode[] = series?.episodes;
  const isAuthenticated = data?.isAuthenticated;

  const insets = useSafeAreaInsets();
  const ITEM_HEIGHT = windowHeight + insets.bottom;
  const flatListRef = useRef<FlatList>(null);

  const [isEpisodesVisible, setIsEpisodesVisible] = useState(false);

  useEffect(() => {
    if (episodes?.length > 0) {
      setEpisodes(episodes);
      const defaultEpisodeId = episodeId || episodes[0].id;
      setCurrentEpisodeId(defaultEpisodeId);
    }
  }, [episodes, episodeId, setEpisodes, setCurrentEpisodeId]);

  const scrollToEpisode = useCallback(
    (index: number) => {
      try {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      } catch (e) {
        flatListRef.current?.scrollToOffset({
          offset: ITEM_HEIGHT * index,
          animated: false,
        });
      }
    },
    [ITEM_HEIGHT],
  );

  const handleEpisodeSelect = (episode: Episode, index: number) => {
    setCurrentEpisodeId(episode.id);
    scrollToEpisode(index);
    setIsEpisodesVisible(false);
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      if (viewableItems.length > 0) {
        const visibleItem = viewableItems[0];
        if (visibleItem.isViewable) {
          setCurrentEpisodeId(visibleItem.item.id);
        }
      }
    },
    [setCurrentEpisodeId],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <VideoListItem
        item={item}
        movie={series}
        onEpisodesPress={() => setIsEpisodesVisible(true)}
        isAuthenticated={isAuthenticated}
      />
    ),
    [series, isAuthenticated],
  );

  const validIndex =
    episodes?.findIndex(ep => ep.id === (currentEpisodeId || episodeId)) ?? 0;
  const safeIndex = validIndex >= 0 ? validIndex : 0;

  useEffect(() => {
    if (!episodes || episodes.length === 0) return;
    requestAnimationFrame(() => scrollToEpisode(safeIndex));
  }, [episodes, currentEpisodeId, episodeId, safeIndex, scrollToEpisode]);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.emptyText}>Error loading videos.</Text>
      </View>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.emptyText}>No episodes found.</Text>
      </View>
    );
  }

  const activeEpisode = episodes.find(e => e.id === currentEpisodeId);

  return (
    <View style={[styles.container, { height: ITEM_HEIGHT }]}>
      <FlatList
        ref={flatListRef}
        data={episodes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        initialScrollIndex={safeIndex}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        snapToAlignment="start"
        disableIntervalMomentum
        removeClippedSubviews
        overScrollMode="never"
      />
      <EpisodesBottomSheet
        visible={isEpisodesVisible}
        onClose={() => setIsEpisodesVisible(false)}
        episodes={episodes}
        activeEpisode={activeEpisode}
        onEpisodeSelect={handleEpisodeSelect}
        isAuthenticated={isAuthenticated}
        isPending={isLoading}
        series={series}
        screenType="videoScreen"
      />
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { color: 'white', fontSize: 16 },
  videoContainer: {
    width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  overlay: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  leftOverlay: { flex: 1 },
  rightOverlay: { marginLeft: 16 },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'white',
    marginRight: 8,
  },
  username: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { color: 'white', fontSize: 14 },
  episodesButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  episodesButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
