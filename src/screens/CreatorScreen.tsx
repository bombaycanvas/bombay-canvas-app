import { useRoute } from '@react-navigation/native';
import { StyleSheet, ScrollView } from 'react-native';
import CreatorLanding from '../components/CreatorLanding';
import { useMoviesDataByCreator } from '../api/video';
import CreatorGrids from '../components/CreatorGrid';

const CreatorScreen = () => {
  const route = useRoute();
  const { id } = route.params;
  const { data, isLoading } = useMoviesDataByCreator(id);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <CreatorLanding data={data} />
      {data?.allMovies?.length > 0 && (
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
  },
});
