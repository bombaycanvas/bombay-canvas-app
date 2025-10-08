import { useNavigation, useRoute } from '@react-navigation/native';
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
  Modal,
} from 'react-native';
import { useMoviesDataById } from '../api/video';
import VideoPlayer from '../components/VideoPlayer';
import { useVideoStore } from '../store/videoStore';
import { X } from 'lucide-react-native';

const { height, width } = Dimensions.get('window');

const EpisodesBottomSheet = ({
  visible,
  onClose,
  episodes,
  activeEpisode,
  onEpisodeSelect,
}: any) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Episodes</Text>
            <TouchableOpacity onPress={onClose}>
              <X color="white" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={episodes}
            keyExtractor={item => item.id}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={[
                  styles.episodeItem,
                  activeEpisode?.id === item.id && styles.activeEpisodeItem,
                ]}
                onPress={() => onEpisodeSelect(item, index)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.thumbnail}
                />
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitleText}>
                    E{item.episodeNo}: {item.title}
                  </Text>
                  <Text style={styles.episodeDuration}>{item.duration}m</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

const VideoListItem = React.memo(
  ({
    item,
    movie,
    onEpisodesPress,
  }: {
    item: any;
    movie: any;
    onEpisodesPress: () => void;
  }) => {
    const navigation = useNavigation();
    return (
      <View style={styles.videoContainer}>
        <VideoPlayer episode={item} movie={movie} />
        <View style={styles.overlay}>
          <View style={styles.leftOverlay}>
            <View style={styles.textContainer}>
              <View style={styles.userInfo}>
                <Image
                  source={{ uri: movie?.uploader?.profiles?.[0]?.avatarUrl }}
                  style={styles.avatar}
                />
                <Text
                  onPress={() =>
                    navigation.navigate(
                      'Creator' as never,
                      { id: movie.uploader?.id } as never,
                    )
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
  const route = useRoute();
  const { id } = route.params ?? {};

  const { setEpisodes, setCurrentEpisodeId, currentEpisodeId } =
    useVideoStore();

  const { data, isLoading, isError } = useMoviesDataById(
    id ?? 'cmff99fyf0005s60esh5ndrws',
  );

  const episodes = data?.series?.episodes;
  const flatListRef = useRef<FlatList>(null);
  const [isEpisodesVisible, setIsEpisodesVisible] = useState(false);

  useEffect(() => {
    if (episodes?.length > 0) {
      setEpisodes(episodes);

      if (!currentEpisodeId) {
        setCurrentEpisodeId(episodes[0].id);
      }
    }
  }, [episodes, setEpisodes, setCurrentEpisodeId, currentEpisodeId]);

  const handleEpisodeSelect = (episode: any, index: number) => {
    setCurrentEpisodeId(episode.id);
    flatListRef.current?.scrollToIndex({ animated: true, index });
    setIsEpisodesVisible(false);
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
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
        movie={data?.series}
        onEpisodesPress={() => setIsEpisodesVisible(true)}
      />
    ),
    [data?.series],
  );

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
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={episodes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        pagingEnabled
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsVerticalScrollIndicator={false}
        getItemLayout={(_data, index) => ({
          length: height,
          offset: height * index,
          index,
        })}
        initialScrollIndex={episodes.findIndex(
          item => item.id === currentEpisodeId,
        )}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
      <EpisodesBottomSheet
        visible={isEpisodesVisible}
        onClose={() => setIsEpisodesVisible(false)}
        episodes={episodes}
        activeEpisode={activeEpisode}
        onEpisodeSelect={handleEpisodeSelect}
      />
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'white',
    fontSize: 16,
  },
  videoContainer: {
    height: height,
    width: width,
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
  leftOverlay: {
    flex: 1,
  },
  rightOverlay: {
    marginLeft: 16,
  },
  textContainer: {},
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'white',
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: 'white',
    fontSize: 14,
  },
  episodesButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  episodesButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    height: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  activeEpisodeItem: {
    backgroundColor: '#333',
  },
  thumbnail: {
    width: 120,
    height: 70,
    borderRadius: 4,
  },
  episodeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  episodeTitleText: {
    color: 'white',
    fontSize: 16,
  },
  episodeDuration: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 4,
  },
});
