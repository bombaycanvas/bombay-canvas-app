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
        <Image
          source={{
            uri:
              movie.uploader?.profiles?.[0]?.avatarUrl ||
              'https://via.placeholder.com/50',
          }}
          style={styles.avatar}
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
        {shuffleArray(movieData).map(renderCard)}
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
    // marginBottom: 12,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
  card: {
    width: 105,
    height: 165,
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
    height: 12,
    width: 42,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    // paddingHorizontal: 6,
    // paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatar: {
    width: 9.5,
    height: 9.5,
    borderRadius: 50,
    marginRight: 6,
  },
  name: {
    fontSize: 4.5,
    color: '#fff',
  },
});
