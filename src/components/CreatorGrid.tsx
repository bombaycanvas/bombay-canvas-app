import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
} from 'react-native';

type Movie = {
  id: string;
  posterUrl?: string;
  uploaderId?: string;
  uploader?: {
    name?: string;
    profiles?: { avatarUrl?: string }[];
  };
};

type CreatorGridsProps = {
  data?: { allMovies?: Movie[] };
  isLoading?: boolean;
  onNavigateVideo?: (id: string) => void;
  onNavigateCreator?: (id: string) => void;
};

const CreatorGrids: React.FC<CreatorGridsProps> = ({
  data,
  isLoading,
  onNavigateVideo,
  onNavigateCreator,
}) => {
  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        {Array.from({ length: 15 }).map((_, index) => (
          <View key={index} style={styles.skeletonCard} />
        ))}
      </View>
    );
  }

  return (
    <FlatList
      data={data?.allMovies ?? []}
      numColumns={4}
      contentContainerStyle={styles.wrapper}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.card, { backgroundColor: '#222' }]}
          onPress={() => onNavigateVideo?.(item.id)}
        >
          <Image
            source={{ uri: item.posterUrl }}
            style={styles.poster}
            resizeMode="cover"
          />

          <TouchableOpacity
            style={styles.video}
            onPress={() => onNavigateCreator?.(item.uploaderId ?? '')}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: item.uploader.profiles[0].avatarUrl }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.name}>{item?.uploader?.name}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
};

export default CreatorGrids;

const styles = StyleSheet.create({
  wrapper: {
    flexGrow: 1,
    paddingHorizontal: 16,
    backgroundColor: 'black',
    gap: 16,
  },
  skeletonCard: {
    width: 150,
    height: 250,
    backgroundColor: '#333',
    borderRadius: 12,
    margin: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: 80,
    height: 130,
    borderRadius: 12,
  },
  video: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  avatarWrapper: {
    width: 7,
    height: 7,
    borderRadius: 50,
    overflow: 'hidden',
    marginRight: 6,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  name: {
    color: '#fff',
    fontSize: 5,
  },
});
