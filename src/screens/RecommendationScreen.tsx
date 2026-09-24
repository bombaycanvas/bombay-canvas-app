import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StatusBar,
  StyleSheet,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import RecommendationPost from '../components/RecommendationPost';
import LoadingDiscovery from '../components/LoadingDiscovery';
import NoMatchesFound from '../components/NoMatchesFound';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { CommentsBottomSheet } from '../components/CommentsBottomSheet';
import { useMoviesData, useMoviesDataById } from '../api/video';
import { useAuthStore } from '../store/authStore';
import { trackEvent } from '../api/events';

const RecommendationScreen = () => {
  const navigation = useNavigation<any>();

  const { data: moviesResponse, isLoading: loading } = useMoviesData();
  const data = (moviesResponse?.series || []).filter(
    (item: any) => item.trailerUrl,
  );

  const [pageHeight, setPageHeight] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [episodesSeriesId, setEpisodesSeriesId] = useState<string | null>(null);
  const [commentsSeries, setCommentsSeries] = useState<any>(null);
  const isSheetOpen = !!episodesSeriesId || !!commentsSeries;

  const { isAuthenticated } = useAuthStore();
  const { data: episodesSeriesData, isLoading: isEpisodesLoading } =
    useMoviesDataById(episodesSeriesId ?? '');
  const episodesSeries = episodesSeriesData?.series;

  const [activeIndex, setActiveIndex] = useState(0);

  const viewStartTime = useRef<number>(Date.now());
  const currentItemId = useRef<string | number | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0 && height !== pageHeight) setPageHeight(height);
  };

  const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

  const openEpisodes = useCallback(
    (item: any) => setEpisodesSeriesId(item.id),
    [],
  );
  const closeEpisodes = useCallback(() => setEpisodesSeriesId(null), []);

  const openComments = useCallback((item: any) => setCommentsSeries(item), []);
  const closeComments = useCallback(() => setCommentsSeries(null), []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      const { item, index } = viewableItems[0];
      if (index != null) setActiveIndex(index);

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
    ({ item, index }: { item: any; index: number }) => (
      <RecommendationPost
        item={item}
        navigation={navigation}
        isActive={index === activeIndex}
        shouldPreload={index === activeIndex + 1}
        height={pageHeight}
        isMuted={isMuted}
        isPaused={isSheetOpen}
        onToggleMute={toggleMute}
        onEpisodesPress={openEpisodes}
        onCommentsPress={openComments}
      />
    ),
    [
      navigation,
      activeIndex,
      pageHeight,
      isMuted,
      isSheetOpen,
      toggleMute,
      openEpisodes,
      openComments,
    ],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 70,
  }).current;

  return (
    <View style={styles.container} onLayout={handleLayout}>
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
        pageHeight > 0 && (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            pagingEnabled
            snapToInterval={pageHeight}
            snapToAlignment="start"
            disableIntervalMomentum
            decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.85}
            getItemLayout={(_, index) => ({
              length: pageHeight,
              offset: pageHeight * index,
              index,
            })}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            contentInsetAdjustmentBehavior="never"
            overScrollMode="never"
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            windowSize={3}
          />
        )
      )}

      <EpisodesBottomSheet
        visible={!!episodesSeriesId}
        onClose={closeEpisodes}
        episodes={episodesSeries?.episodes}
        isAuthenticated={episodesSeries?.isAuthenticated || isAuthenticated}
        isPending={isEpisodesLoading}
        series={episodesSeries}
        screenType="seriesDetail"
        posterUrl={episodesSeries?.posterUrl}
      />

      <CommentsBottomSheet
        visible={!!commentsSeries}
        onClose={closeComments}
        series={commentsSeries}
      />
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
