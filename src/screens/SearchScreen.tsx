import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMoviesData } from '../api/video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const { width } = Dimensions.get('window');

const SearchScreen = () => {
  const navigation = useNavigation();
  const { data: movieData } = useMoviesData();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredMovies =
        movieData?.allMovies?.filter(movie =>
          movie.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()),
        ) || [];
      setSearchResults(filteredMovies);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, movieData]);

  const renderMovieItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => navigation.navigate('Video', { id: item.id })}
      >
        <Image
          source={{ uri: item.posterUrl }}
          style={styles.resultThumbnail}
        />
        <Text style={styles.resultText} numberOfLines={1}>
          {item.title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderTrendingItem = ({ item }) => (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => navigation.navigate('Video', { id: item.id })}
    >
      <Image
        source={{ uri: item.posterUrl }}
        style={styles.trendingThumbnail}
      />
    </TouchableOpacity>
  );

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
          data={searchResults}
          renderItem={renderMovieItem}
          keyExtractor={item => item.id.toString()}
          style={styles.resultsList}
          ListEmptyComponent={
            <Text style={styles.noResultsText}>No movies found.</Text>
          }
        />
      ) : (
        <View style={styles.exploreContent}>
          <Text style={styles.sectionTitle}>Trending Now</Text>
          <FlatList
            data={movieData?.allMovies}
            renderItem={renderTrendingItem}
            keyExtractor={item => item.id.toString()}
            numColumns={3}
            style={styles.trendingList}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 12,
  },
  resultsList: {
    paddingHorizontal: 15,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultThumbnail: {
    width: 80,
    height: 45,
    borderRadius: 5,
    marginRight: 12,
  },
  resultText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  noResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
  },
  exploreContent: {
    flex: 1,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  trendingList: {
    flex: 1,
  },
  trendingItem: {
    width: width / 3,
    height: width / 2,
  },
  trendingThumbnail: {
    flex: 1,
    margin: 1,
  },
});

export default SearchScreen;
