import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMoviesData } from '../api/video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../types/movie';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { SearchListDataImage } from '../api/const';
import Drama from '../images/Drama.jpg';
import { FlatGrid } from 'react-native-super-grid';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

type SearchListKey = keyof typeof SearchListDataImage;
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

const SearchScreen = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const { data: movieData } = useMoviesData();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredMovies =
        movieData?.series?.filter(movie =>
          movie.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()),
        ) || [];
      setSearchResults(filteredMovies);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, movieData]);

  // Create genre-based structure
  const getMoviesByGenre = () => {
    const genreMap: Record<string, Movie[]> = {} as Record<string, Movie[]>;
    movieData?.series?.forEach(movie => {
      movie.genres?.forEach(genre => {
        if (!genreMap[genre.name]) genreMap[genre.name] = [];
        genreMap[genre.name].push(movie);
      });
    });
    return genreMap;
  };

  const genreMap = getMoviesByGenre();
  const renderMovieItem = ({ item }: { item: Movie }) => (
    <TouchableOpacity
      style={styles.movieItem}
      onPress={() => navigation.navigate('Video', { id: item.id })}
    >
      <Image source={{ uri: item.posterUrl }} style={styles.poster} />
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {item.title.charAt(0).toUpperCase() + item.title.slice(1)}
      </Text>
    </TouchableOpacity>
  );

  const getItemURL = (item: string) => {
    if (item in SearchListDataImage) {
      return SearchListDataImage[item as SearchListKey];
    }
    return Drama;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={22}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      {searchQuery ? (
        <FlatGrid
          key={'list-search'}
          data={searchResults ?? []}
          renderItem={renderMovieItem}
          spacing={12}
          itemDimension={110}
          scrollEnabled={false}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No series found.</Text>
          }
          contentContainerStyle={styles.wrapper}
        />
      ) : (
        <FlatList
          key={'list-categories'}
          data={Object.keys(genreMap)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryBox}
              onPress={() =>
                navigation.navigate('CategoryMovies', {
                  category: item,
                  movies: genreMap[item],
                })
              }
            >
              <ImageBackground
                source={getItemURL(item)}
                style={styles.coverPhoto}
              />
              <View style={styles.text1}>
                <Text style={styles.categoryAnotherText}>{item}</Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: 'space-between',
          }}
          contentContainerStyle={{ padding: 15 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  text1: {
    position: 'absolute',
    inset: 0,
  },
  wrapper: {
    flexGrow: 1,
    backgroundColor: 'black',
  },
  coverPhoto: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    opacity: 0.5,
  },
  container: { flex: 1, backgroundColor: '#000', paddingTop: 20 },
  searchHeader: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, color: 'white', fontSize: 16, paddingVertical: 12 },
  resultsList: { paddingHorizontal: 15 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultThumbnail: { width: 80, height: 45, borderRadius: 5, marginRight: 12 },
  resultText: { color: 'white', fontSize: 16, flex: 1 },
  noResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
  genreContainer: { flex: 1 },
  genreSection: { marginBottom: 25 },
  genreTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  movieItem: { flex: 0.48 },
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
  movieThumbnail: { flex: 1, borderRadius: 8 },
  movieTitle: {
    color: 'white',
    marginTop: 5,
    fontSize: 14,
    textAlign: 'center',
  },
  categoryBox: {
    width: '48%',
    minHeight: 80,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'flex-end',
    marginBottom: 15,
    overflow: 'hidden',
  },
  categoryText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    textAlign: 'left',
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  categoryAnotherText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    textAlign: 'left',
    width: '100%',
    maxWidth: '90%',
    flexWrap: 'wrap',
    lineHeight: 20,
    marginTop: 'auto',
    marginBottom: 10,
    marginLeft: 10,
  },
});

export default SearchScreen;
