import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Text,
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useMoviesDataById } from '../api/video';
import VideoPlayer from '../components/VideoPlayer';

const { height, width } = Dimensions.get('window');

const VideoListItem = React.memo(
  ({
    item,
    movie,
    isPlaying,
  }: {
    item: any;
    movie: any;
    isPlaying: boolean;
  }) => {
    const [playing, setPlaying] = useState(isPlaying);
    const navigation = useNavigation();

    useEffect(() => {
      setPlaying(isPlaying);
    }, [isPlaying]);

    return (
      <View style={styles.videoContainer}>
        <VideoPlayer
          episode={item}
          movie={movie}
          playing={playing}
          setPlaying={setPlaying}
        />
        <View style={styles.overlay}>
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
      </View>
    );
  },
);

const VideoScreen = () => {
  const route = useRoute();
  const { id } = route.params ?? {};

  const [viewableItemId, setViewableItemId] = useState<string | null>(null);

  const { data, isLoading } = useMoviesDataById(
    id ?? 'cmff99fyf0005s60esh5ndrws',
  );

  const episodes = data?.movie?.episodes;

  useEffect(() => {
    if (episodes?.length > 0 && !viewableItemId) {
      setViewableItemId(episodes[0].id);
    }
  }, [episodes, viewableItemId]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (viewableItems.length > 0) {
        const visibleItem = viewableItems[0];
        if (visibleItem.isViewable && visibleItem.item.id !== viewableItemId) {
          setViewableItemId(visibleItem.item.id);
        }
      }
    },
    [viewableItemId],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(
    ({ item }) => (
      <VideoListItem
        item={item}
        movie={data?.movie}
        isPlaying={item.id === viewableItemId}
      />
    ),
    [viewableItemId, data?.movie],
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="white" />
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

  return (
    <View style={styles.container}>
      <FlatList
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
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
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
    width: '100%',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
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
});
