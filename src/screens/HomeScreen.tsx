import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useMoviesData } from '../api/video';
import Landing from '../components/Landing';
import Explore from '../components/Explore';

const HomeScreen = () => {
  const { data, isLoading, refetch } = useMoviesData();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      // refreshControl={
      //   <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      // }
    >
      <Landing movieData={data?.series} isLoading={isLoading} />
      <Explore latest movieData={data?.series ?? []} isLoading={isLoading} />
      <Explore movieData={data?.series ?? []} isLoading={isLoading} />
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
