import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMoviesData } from '../api/video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Movie } from '../types/movie';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type SearchScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Search'
>;

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
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const allGenres = React.useMemo(() => {
    const genreSet = new Set<string>();
    movieData?.allMovies?.forEach(movie => {
      movie?.genres?.forEach(genre => genreSet.add(genre.name));
    });
    return Array.from(genreSet);
  }, [movieData]);

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredCategories =
        allGenres.filter(genre =>
          genre.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
        ) || [];
      setSearchResults(filteredCategories);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, allGenres]);

  // Create genre-based structure
  const getMoviesByGenre = () => {
    const genreMap: Record<string, Movie[]> = {} as Record<string, Movie[]>;
    movieData?.allMovies?.forEach(movie => {
      movie.genres?.forEach(genre => {
        if (!genreMap[genre.name]) genreMap[genre.name] = [];
        genreMap[genre.name].push(movie);
      });
    });
    return genreMap;
  };

  const genreMap = getMoviesByGenre();

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
            placeholder="Search for movies, series and more"
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>
      {searchQuery ? (
        <FlatList
          key={'list-search'}
          data={searchResults}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.categoryBox}
              onPress={() =>
                navigation.navigate('CategoryMovies', {
                  category: item,
                  movies: genreMap[item] ?? [],
                })
              }
            >
              <Text style={styles.categoryText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={item => item}
          numColumns={2}
          columnWrapperStyle={{
            justifyContent: 'space-between',
          }}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No categories found.</Text>
          }
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
              <Text style={styles.categoryText}>{item}</Text>
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
  poster: { width: '100%', height: 180, borderRadius: 10 },
  title: {
    color: 'white',
    marginTop: 5,
    fontSize: 16,
    textAlign: 'left',
    textTransform: 'capitalize',
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
    minHeight: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'flex-end',
    padding: 12,
    marginBottom: 15,
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
});

export default SearchScreen;
