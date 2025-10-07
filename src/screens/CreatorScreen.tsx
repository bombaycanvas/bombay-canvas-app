import { useRoute } from '@react-navigation/native';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import CreatorLanding from '../components/CreatorLanding';
import { useMoviesDataByCreator } from '../api/video';
import CreatorGrids from '../components/CreatorGrid';
import { useCallback } from 'react';
import { View, Text } from 'react-native';

const CreatorScreen = () => {
  const route = useRoute();
  const { id } = route.params ?? { id: 'cmfc48arw0002s60ex05k9w5c' };
  const { data, isLoading, refetch, isFetching } = useMoviesDataByCreator(
    id ?? 'cmfc48arw0002s60ex05k9w5c',
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const noSeries = !data?.series || data?.series?.length === 0;

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

      {noSeries ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            This creator hasn’t uploaded any series yet.
          </Text>
        </View>
      ) : (
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlign: 'center',
  },
});
