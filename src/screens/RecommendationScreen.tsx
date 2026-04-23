import React, { useState, useCallback, useRef } from 'react';
import { View, FlatList, StatusBar, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import RecommendationPost from '../components/RecommendationPost';
import LoadingDiscovery from '../components/LoadingDiscovery';
import NoMatchesFound from '../components/NoMatchesFound';
import { useMoviesData } from '../api/video';
import { trackEvent } from '../api/events';

const RecommendationScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const { data: moviesResponse, isLoading: loading } = useMoviesData();
  const data = (moviesResponse?.series || []).filter(
    (item: any) => item.trailerUrl,
  );

  const [activeId, setActiveId] = useState<string | number | null>(null);
  const activeIdRef = useRef<string | number | null>(null);
  const pendingActiveId = useRef<string | number | null>(null);

  const viewStartTime = useRef<number>(Date.now());
  const currentItemId = useRef<string | number | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      const item: any = viewableItems[0].item;
      pendingActiveId.current = item.id;

      if (activeIdRef.current === null) {
        activeIdRef.current = item.id;
        setActiveId(item.id);
      }

      const now = Date.now();

      if (currentItemId.current) {
        const duration = (now - viewStartTime.current) / 1000;
        trackEvent({
          userId: 'user_001',
          contentId: currentItemId.current,
          event: duration >= 5 ? 'watch_time' : 'skip',
          duration,
        });
      }

      currentItemId.current = item.id;
      viewStartTime.current = now;
    },
    [],
  );
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <RecommendationPost
        item={item}
        navigation={navigation}
        isActive={item.id === activeId}
      />
    ),
    [navigation, activeId],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {data.length === 0 && loading ? (
        <LoadingDiscovery />
      ) : data.length === 0 ? (
        <NoMatchesFound />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          onMomentumScrollEnd={() => {
            const next = pendingActiveId.current;
            activeIdRef.current = next;
            setActiveId(next);
          }}
          onScrollEndDrag={() => {
            if (Platform.OS === 'ios') return;
            const next = pendingActiveId.current;
            activeIdRef.current = next;
            setActiveId(next);
          }}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 200,
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          contentInsetAdjustmentBehavior="never"
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={50}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default RecommendationScreen;
