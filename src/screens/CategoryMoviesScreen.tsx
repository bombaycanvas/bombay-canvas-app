import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Movie } from '../types/movie';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { FlatGrid } from 'react-native-super-grid';
import { SafeAreaView } from 'react-native-safe-area-context';

type CategoryMoviesRoute = {
  params: {
    category: string;
    movies: Movie[];
  };
};

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

const CategoryMoviesScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const route = useRoute<RouteProp<CategoryMoviesRoute, 'params'>>();
  const { movies = [] } = route.params || { movies: [] };

  const MovieCard = React.memo(
    ({ item, navigation }: { item: Movie; navigation: any }) => {
      const cardRef = React.useRef<View>(null);
      return (
        <View ref={cardRef}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.movieItem}
            onPress={() => {
              cardRef.current?.measureInWindow((x, y, width, height) => {
                navigation.navigate('SeriesDetail', {
                  id: item.id,
                  cardLayout: { x, y, width, height },
                  posterUrl: item.posterUrl,
                });
              });
            }}
          >
            <Image source={{ uri: item.posterUrl }} style={styles.poster} />
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
            </Text>
          </TouchableOpacity>
        </View>
      );
    },
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatGrid
        data={movies}
        spacing={12}
        itemDimension={110}
        renderItem={({ item }) => (
          <MovieCard item={item} navigation={navigation} />
        )}
        keyExtractor={item => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.wrapper}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  wrapper: {
    flexGrow: 1,
    backgroundColor: 'black',
  },
  movieItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  poster: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(205,106,0,0.25)',
  },
  title: {
    color: 'white',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'left',
    width: '100%',
  },
});

export default CategoryMoviesScreen;
