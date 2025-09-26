import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  FlatList,
} from 'react-native';
import Video from 'react-native-video';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useGetCoverVideo } from '../api/video';
import LinearGradient from 'react-native-linear-gradient';
import PlayButtonIcon from './assets/PlayButtonIcon';

import { Pause } from 'lucide-react-native';

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

const { height } = Dimensions.get('window');

interface LandingProps {
  movieData?: any[];
  isLoading?: boolean;
}

const Landing: React.FC<LandingProps> = ({ movieData }) => {
  const videoRef = useRef(null);
  const navigation = useNavigation();
  const [isPlaying, setIsPlaying] = useState(true);
  const { data } = useGetCoverVideo();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useFocusEffect(
    useCallback(() => {
      setIsPlaying(true);
      return () => {
        setIsPlaying(false);
      };
    }, []),
  );

  useEffect(() => {
    if (debouncedSearchQuery) {
      const filteredMovies =
        movieData?.filter(movie =>
          movie.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()),
        ) || [];
      setSearchResults(filteredMovies);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, movieData]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

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

  return (
    <View style={styles.layout}>
      <Video
        ref={videoRef}
        source={{ uri: data?.CoverUrlVideo?.url }}
        style={styles.backgroundVideo}
        resizeMode="cover"
        repeat
        paused={!isPlaying}
      />
      <LinearGradient
        colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
        style={styles.gradient}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0 }}
      />

      <View style={styles.content}>
        <Image
          source={require('../images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.mainTitle}>
          India’s first{'\n'}
          <Text style={styles.mainTitleBold}>vertical OTT platform</Text>
        </Text>

        <Text style={styles.para}>
          From microdramas to series in travel, food, fashion, culture and much
          more — discover it all in vertical
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Search for movies..."
          placeholderTextColor="#A9A9A9"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {searchQuery ? (
          <FlatList
            data={searchResults}
            renderItem={renderMovieItem}
            keyExtractor={item => item.id.toString()}
            style={styles.resultsList}
            ListEmptyComponent={
              <Text style={styles.noResultsText}>No movies found.</Text>
            }
            nestedScrollEnabled={true}
          />
        ) : (
          <View style={styles.ctaWrapper}>
            <TouchableOpacity
              style={styles.infoCta}
              onPress={() =>
                navigation.navigate('Creator', { id: data?.admin?.id })
              }
            >
              <Image
                source={{
                  uri:
                    data?.admin?.profiles[0]?.avatarUrl ?? '/static/avatar.jpg',
                }}
                style={styles.avatar}
              />
              <Text style={styles.name}>{data?.admin?.profiles[0]?.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
              {isPlaying ? (
                <Pause fill={'#ffffff'} color="white" height={19} width={17} />
              ) : (
                <PlayButtonIcon />
              )}
              <Text style={styles.playText}>
                {isPlaying ? ' Pause' : ' Play'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default Landing;

const styles = StyleSheet.create({
  layout: {
    position: 'relative',
    width: '100%',
    height: height * 0.58,
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  content: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'column',
    gap: 8,
  },
  logo: {
    width: 52,
    height: 20,
  },
  mainTitle: {
    fontFamily: 'HelveticaNowDisplay-Light',
    fontWeight: '300',
    fontSize: 30,
    color: '#fff',
  },
  mainTitleBold: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    fontSize: 30,
  },
  para: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: '400',
    fontSize: 12,
    color: '#fff',
    maxWidth: '90%',
  },
  searchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    color: 'white',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 10,
  },
  resultsList: {
    maxHeight: height * 0.15, // Limit height of search results
    marginTop: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', //
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultThumbnail: {
    width: 60,
    height: 34,
    borderRadius: 4,
    marginRight: 10,
  },
  resultText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  noResultsText: {
    color: '#A9A9A9',
    textAlign: 'center',
    marginTop: 10,
  },
  ctaWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  playButton: {
    minWidth: 100,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#ff6a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playText: {
    color: 'white',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: '500',
    fontSize: 12,
  },
  infoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.4,
    borderColor: 'rgba(1,1,1,0.2)',
    shadowColor: 'rgba(61,61,61,0.12)',
    shadowOffset: { width: -1, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8.6,
    elevation: 5,
  },
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 12,
    marginRight: 6,
  },
  name: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: '400',
    fontSize: 12,
  },
});
