import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useMoviesData, useRecommendedSeriesData } from '../api/video';
import Landing from '../components/Landing';
import Explore from '../components/Explore';

const HomeScreen = () => {
  const { data, isLoading } = useMoviesData();
  const { data: recommendedSeriesData, isLoading: isRecommendedLoading } =
    useRecommendedSeriesData();
  // const [refreshing, setRefreshing] = useState(false);

  // const onRefresh = useCallback(async () => {
  //   setRefreshing(true);
  //   await refetch();
  //   setRefreshing(false);
  // }, [refetch]);

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

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      // refreshControl={
      //   <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      // }
    >
      <Landing />
      <Explore
        heading={'New on canvas'}
        movieData={data?.series ?? []}
        isLoading={isLoading}
      />
      <Explore
        heading={'Recommended for you'}
        movieData={recommendedSeriesData?.series ?? []}
        isLoading={isRecommendedLoading}
      />
      {Object.entries(genreMap)?.map(([genreName, movies]) => (
        <Explore
          key={genreName}
          heading={genreName}
          movieData={movies}
          isLoading={isLoading}
        />
      ))}
    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
});
