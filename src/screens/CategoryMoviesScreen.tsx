import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Movie } from '../types/movie';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

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

  const renderMovie = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate('Video', { id: item.id })}
    >
      <Image source={{ uri: item.posterUrl }} style={styles.poster} />
      <Text style={styles.title}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={movies}
        renderItem={renderMovie}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: 'space-between',
          marginBottom: 15,
        }}
        contentContainerStyle={{ padding: 15 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  movieItem: { flex: 0.48 },
  poster: { width: '100%', height: 180, borderRadius: 10 },
  title: {
    color: 'white',
    marginTop: 5,
    fontSize: 16,
    textAlign: 'left',
    textTransform: 'capitalize',
  },
});

export default CategoryMoviesScreen;
