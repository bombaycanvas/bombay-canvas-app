import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { useMoviesData } from '../api/video';
import Landing from '../components/Landing';
import Explore from '../components/Explore';

const HomeScreen = () => {
  const { data, isLoading } = useMoviesData();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Landing movieData={data?.allMovies} isLoading={isLoading} />
      <Explore latest movieData={data?.allMovies} isLoading={isLoading} />
      <Explore movieData={data?.allMovies} isLoading={isLoading} />
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
