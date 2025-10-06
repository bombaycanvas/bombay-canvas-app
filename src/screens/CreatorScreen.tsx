import { useRoute } from '@react-navigation/native';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import CreatorLanding from '../components/CreatorLanding';
import { useMoviesDataByCreator } from '../api/video';
import CreatorGrids from '../components/CreatorGrid';
import { useCallback } from 'react';

const CreatorScreen = () => {
  const route = useRoute();
  const { id } = route.params ?? { id: 'cmfc48arw0002s60ex05k9w5c' };
  const { data, isLoading, refetch, isFetching } = useMoviesDataByCreator(
    id ?? 'cmfc48arw0002s60ex05k9w5c',
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={onRefresh}
          tintColor="#fff"
        />
      }
    >
      <CreatorLanding data={data} />
      {data?.series?.length > 0 && (
        <CreatorGrids data={data} isLoading={isLoading} />
      )}
    </ScrollView>
  );
};

export default CreatorScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
});
