import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';

type Movie = any;

type ExploreProps = {
  latest?: boolean;
  movieData: Movie[];
  isLoading?: boolean;
};

const Explore: React.FC<ExploreProps> = ({ latest, movieData, isLoading }) => {
  const navigation = useNavigation();

  const shuffleArray = (array: Movie[]) => {
    if (latest) return array;
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>
          {latest ? 'New On Canvas' : 'Recommended for You'}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 10 }}
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <View
              key={`skeleton-${index}`}
              style={[styles.card, { backgroundColor: '#333' }]}
            />
          ))}
        </ScrollView>
      </View>
    );
  }

  const renderCard = (movie: Movie) => (
    <TouchableOpacity
      key={movie.id}
      style={[styles.card, { backgroundColor: 'rgba(0, 0, 0, 0.36) ' }]}
      onPress={() =>
        navigation.navigate('Video' as never, { id: movie.id } as never)
      }
    >
      <Image
        source={{
          uri: movie.posterUrl || 'https://via.placeholder.com/300x400',
        }}
        style={styles.cardImage}
        resizeMode="cover"
      />
      <TouchableOpacity
        style={styles.videoOverlay}
        onPress={() =>
          navigation.navigate(
            'Creator' as never,
            { id: movie.uploader?.id } as never,
          )
        }
      >
        <FastImage
          source={{
            uri:
              movie.uploader?.profiles?.[0]?.avatarUrl ||
              'https://via.placeholder.com/50',
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable,
          }}
          style={styles.avatar}
          resizeMode={FastImage.resizeMode.cover}
        />
        <Text style={styles.name}>{movie.uploader?.name}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {latest ? 'New On Canvas' : 'Recommended for You'}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        {shuffleArray(movieData || []).map(renderCard)}
      </ScrollView>
    </View>
  );
};

export default Explore;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
  card: {
    width: 145,
    height: 210,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    left: 10,
    height: 15,
    width: 'auto',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingRight: 4,
  },
  avatar: {
    width: 15,
    height: 15,
    borderRadius: 50,
    marginRight: 3,
  },
  name: {
    fontSize: 7.5,
    color: '#fff',
  },
});
