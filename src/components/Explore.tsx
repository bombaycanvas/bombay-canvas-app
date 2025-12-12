import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import FastImage from '@d11/react-native-fast-image';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Movie = any;

type ExploreProps = {
  heading: string;
  movieData: Movie[];
  isLoading?: boolean;
};

type RootStackParamList = {
  SeriesDetail: { id: string | number };
  Creator: { id: string | number };
};

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const Explore: React.FC<ExploreProps> = ({ heading, movieData, isLoading }) => {
  const navigation = useNavigation<Navigation>();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>{heading ? heading : 'New On Canvas'}</Text>
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
      onPress={() => navigation.navigate('SeriesDetail', { id: movie.id })}
    >
      <FastImage
        source={{
          uri: movie.posterUrl || 'https://via.placeholder.com/300x400',
          priority: FastImage.priority.high,
          cache: FastImage.cacheControl.immutable,
        }}
        style={styles.cardImage}
        resizeMode={FastImage.resizeMode.cover}
      />
      <TouchableOpacity
        style={styles.videoOverlay}
        onPress={() =>
          navigation.navigate('Creator', { id: movie.uploader?.id })
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
        <Text style={styles.header}>
          {heading.charAt(0).toUpperCase() + heading.slice(1).toLowerCase()}
        </Text>
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 10 }}
      >
        {(movieData || []).map(renderCard)}
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
    width: 130,
    height: 195,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,106,0,0.25)',
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
