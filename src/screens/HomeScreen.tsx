import React from 'react';
import { View, ScrollView } from 'react-native';
import Explore from '../components/Explore';
import Landing from '../components/Landing';
import { useMoviesData, useRecommendedSeriesData } from '../api/video';
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const { data, isLoading } = useMoviesData();
  const { data: recommendedSeriesData, isLoading: isRecommendedLoading } =
    useRecommendedSeriesData();
  const navigation = useNavigation<any>();

  const getMoviesByGenre = () => {
    const genreMap: Record<string, any[]> = {};
    data?.series?.forEach(movie => {
      movie.genres?.forEach(genre => {
        if (!genreMap[genre.name]) genreMap[genre.name] = [];
        genreMap[genre.name].push(movie);
      });
    });
    return genreMap;
  };

  const genreMap = getMoviesByGenre();

  const onCardPress = (movie: any, cardLayout: any) => {
    navigation.navigate('SeriesDetail', {
      id: movie.id,
      cardLayout,
      posterUrl: movie.posterUrl,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <ScrollView>
        <Landing />
        <Explore
          heading={'New on canvas'}
          movieData={data?.series ?? []}
          isLoading={isLoading}
          onCardPress={onCardPress}
        />
        <Explore
          heading={'Recommended for you'}
          movieData={recommendedSeriesData?.series ?? []}
          isLoading={isRecommendedLoading}
          onCardPress={onCardPress}
        />
        {Object.entries(genreMap)?.map(([genreName, movies]) => (
          <Explore
            key={genreName}
            heading={genreName}
            movieData={movies}
            isLoading={isLoading}
            onCardPress={onCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
