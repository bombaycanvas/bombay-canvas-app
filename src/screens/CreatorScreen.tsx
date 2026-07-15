import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import {
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
} from 'react-native';
import CreatorLanding from '../components/CreatorLanding';
import { useMoviesDataByCreator } from '../api/video';
import CreatorGrids from '../components/CreatorGrid';
import { useCallback } from 'react';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CreatorStackParamList = {
  Creator: { id: string };
};

const CreatorScreen = () => {
  const route = useRoute<RouteProp<CreatorStackParamList, 'Creator'>>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const params = route.params as any;
  const id = params?.id ?? 'cmfc48arw0002s60ex05k9w5c';

  const { data, isLoading, refetch, isFetching } = useMoviesDataByCreator(id);
  console.log(data, "data")
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const isDataLoading = isLoading;

  if (isDataLoading) {
    return (
      <View style={styles.mainContainer}>
        <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
          <TouchableOpacity activeOpacity={0.9} onPress={handleBack}>
            <ChevronLeft color="#ff6a00" size={28} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#ef8a4c" />
        </View>
      </View>
    );
  }

  const noSeries = !data?.series || data?.series?.length === 0;

  return (
    <View style={styles.mainContainer}>
      {/* Background */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
          },
        ]}
      />
      <View style={[styles.backButtonContainer, { top: insets.top + 10 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleBack}>
          <ChevronLeft color="#ff6a00" size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.animatedContent}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <ScrollView
            style={styles.scrollView}
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
              <>
                <View style={styles.sectionHeaderContainer}>
                  <Text style={styles.sectionTitle}>
                    Explore More from{' '}
                    <Text style={styles.highlightText}>{data?.creator?.name}</Text>
                  </Text>
                </View>
                <CreatorGrids
                  data={data}
                  creatorName={data?.creator?.name}
                  creatorAvatar={data?.creator?.profile?.avatarUrl}
                  isLoading={isLoading}
                />
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

export default CreatorScreen;
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'black',
  },
  scrollView: {
    flex: 1,
  },
  backButtonContainer: {
    position: 'absolute',
    left: 0,
    zIndex: 999,
    justifyContent: 'center',
    padding: 12,
  },
  animatedContent: {
    flex: 1,
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
  sectionHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 4,
    backgroundColor: 'black',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    color: '#fff',
  },
  highlightText: {
    color: '#ef8a4c',
  },
});
