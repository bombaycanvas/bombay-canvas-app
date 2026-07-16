import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { ReviewModal } from '../components/ReviewModal';
import { WatchRequiredModal } from '../components/WatchRequiredModal';
import { EpisodesBottomSheet } from '../components/EpisodesBottomSheet';
import { capitalizeWords } from '../utils/capitalizeWords';
import { BufferingIndicator } from '../components/videoPlayer/BufferingIndicator';
import { BackButton } from '../components/seriesDetail/BackButton';
import { VideoHeader } from '../components/seriesDetail/VideoHeader';
import { SeriesActions } from '../components/seriesDetail/SeriesActions';
import { CastingControls } from '../components/seriesDetail/CastingControls';
import { CreatorRow } from '../components/seriesDetail/CreatorRow';
import { SeriesFooter } from '../components/seriesDetail/SeriesFooter';
import { useSeriesDetail } from '../hooks/useSeriesDetail';
import { useFlag } from '../api/settings';

const { height } = Dimensions.get('window');

const SeriesDetailScreen: React.FC = () => {
  const showReviews = useFlag('engagement.showReviews', true);
  const {
    insets,
    videoRef,
    navigation,
    id,
    posterUrl,
    isLoading,
    isError,
    switchEpisode,
    isCasting,
    isPlaying,
    setIsPlaying,
    setIsReady,
    setIsLockedVisibleModal,
    setIsPurchaseModal,
    setPurchaseSeries,
    setAuthRedirect,
    isEpisodesSheetOpen,
    setIsEpisodesSheetOpen,
    currentEpisode,
    setCurrentEpisode,
    series,
    previewVideoUrl,
    reviewsData,
    isReviewModalVisible,
    setIsReviewModalVisible,
    handleReviewSubmit,
    myReview,
    upsertReviewMutation,
    isWatchRequiredModalVisible,
    setIsWatchRequiredModalVisible,
    handleWatchNow,
    handleCommentPress,
    videoOpacity,
    isFocused,
    isAuthenticated,
    locked,
    isPaidEpisode,
    shouldFetch,
    handleBack,
    togglePlay,
    handleViewEpisodes,
    playerState,
    MediaPlayerState,
    previous,
    next,
    play,
    pause,
  } = useSeriesDetail();

  const averageRating = (() => {
    if (series?.averageRating !== undefined && series?.averageRating !== null) {
      return Number(series.averageRating);
    }
    if (series?.avgRating !== undefined && series?.avgRating !== null) {
      return Number(series.avgRating);
    }
    if (reviewsData?.averageRating !== undefined && reviewsData?.averageRating !== null) {
      return Number(reviewsData.averageRating);
    }
    if (reviewsData?.avgRating !== undefined && reviewsData?.avgRating !== null) {
      return Number(reviewsData.avgRating);
    }
    const reviews = reviewsData?.reviews || [];
    const totalReviews = reviews.length + (myReview ? 1 : 0);
    if (totalReviews === 0) return 0;
    const sum = reviews.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) + (myReview?.rating || 0);
    return sum / totalReviews;
  })();

  if (isError) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: 'white' }}>Error loading series.</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#000',
          },
        ]}
      />

      <VideoHeader
        series={series}
        currentEpisode={currentEpisode}
        isFocused={isFocused}
        videoOpacity={videoOpacity}
        videoRef={videoRef}
        previewVideoUrl={previewVideoUrl}
        isPlaying={isPlaying}
        isCasting={isCasting}
        setIsReady={setIsReady}
      />

      <BackButton
        onPress={handleBack}
        top={insets.top + 10}
      />

      <View style={styles.contentContainer}>
        {series && (
          <View style={styles.contentWrapper}>
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: height * 0.5 },
              ]}
            >
              <View style={styles.content}>
                <Text style={styles.title}>{series.title}</Text>

                <SeriesActions
                  locked={locked}
                  isPaidEpisode={isPaidEpisode}
                  shouldFetch={shouldFetch}
                  isCasting={isCasting}
                  series={series}
                  isPlaying={isPlaying}
                  togglePlay={togglePlay}
                  onUnlockPress={() => {
                    setIsLockedVisibleModal(true);
                    setAuthRedirect({
                      screen: 'SeriesDetail',
                      params: { id, posterUrl },
                    });
                  }}
                  onPurchasePress={() => {
                    setPurchaseSeries(series);
                    setIsPurchaseModal(true);
                  }}
                  onWatchPress={() => {
                    setIsPlaying(false);
                    setTimeout(() => {
                      navigation.navigate('Video', {
                        id,
                        posterUrl,
                      });
                    }, 100);
                  }}
                />

                <Text style={styles.metaText}>
                  {new Date(series.releaseDate).getFullYear()} •{' '}
                  {capitalizeWords(series.genres?.[0]?.name || '')} •{' '}
                  {series.episodes?.length || 0} Episodes
                </Text>

                {isCasting ? (
                  <CastingControls
                    previous={previous}
                    next={next}
                    play={play}
                    pause={pause}
                    playerState={playerState}
                    MediaPlayerState={MediaPlayerState}
                  />
                ) : (
                  <>
                    <View style={styles.uploaderRatingRow}>
                      {series.uploader && (
                        <CreatorRow
                          uploader={series.uploader}
                          style={{ marginBottom: 0 }}
                          onPress={() =>
                            navigation.navigate('Creator', {
                              id: series.uploader?.id,
                            })
                          }
                        />
                      )}

                      {showReviews && (() => {
                        const handleRatePress = () => {
                          if (myReview) {
                            navigation.navigate('Reviews', {
                              seriesId: id,
                              seriesTitle: series.title,
                              posterUrl: series.posterUrl || posterUrl,
                              hasViewed: series?.episodes?.some(
                                (ep: any) => ep.completed || (ep.progress !== undefined && ep.progress > 0)
                              ) || false,
                            });
                          } else {
                            handleCommentPress();
                          }
                        };

                        return (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.rateButtonWithBg}
                            onPress={handleRatePress}
                          >
                            <Star size={14} color="#f5b301" fill="#f5b301" style={averageRating > 0 ? styles.starIconWithRating : styles.starIconWithoutRating} />
                            {averageRating > 0 && (
                              <Text style={styles.rateRatingText}>
                                ({averageRating.toFixed(1)})
                              </Text>
                            )}
                            <Text style={styles.rateButtonWithBgText}>Comments</Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>

                    {series.description && (
                      <Text
                        style={styles.description}
                        numberOfLines={10}
                        ellipsizeMode="tail"
                      >
                        {series.description}
                      </Text>
                    )}
                  </>
                )}

                <View style={{ height: 100 }} />
              </View>
            </ScrollView>
            <SeriesFooter
              onPress={handleViewEpisodes}
              paddingBottom={insets.bottom + 10}
            />
          </View>
        )}
      </View>

      {(isLoading || !series) && (
        <View style={styles.loaderOverlay}>
          <BufferingIndicator />
        </View>
      )}
      {series && (
        <EpisodesBottomSheet
          visible={isEpisodesSheetOpen}
          onClose={() => {
            setIsEpisodesSheetOpen(false);
            setIsPlaying(true);
          }}
          episodes={series.episodes}
          activeEpisode={currentEpisode}
          onEpisodeSelect={(ep: any) => {
            if (isCasting) {
              switchEpisode(series, ep.id, isAuthenticated);
              setCurrentEpisode(ep);
            }
          }}
          isAuthenticated={isAuthenticated}
          isPending={isLoading}
          series={series}
          screenType="seriesDetail"
          posterUrl={posterUrl}
          isCasting={isCasting}
        />
      )}
      {series && (
        <ReviewModal
          visible={isReviewModalVisible}
          onClose={() => {
            setIsReviewModalVisible(false);
          }}
          seriesTitle={series.title}
          posterUrl={series.posterUrl || posterUrl}
          onSubmit={handleReviewSubmit}
          initialRating={myReview?.rating || 0}
          initialText={myReview?.text || ''}
          isSubmitting={upsertReviewMutation.isPending}
        />
      )}
      {series && (
        <WatchRequiredModal
          visible={isWatchRequiredModalVisible}
          onClose={() => setIsWatchRequiredModalVisible(false)}
          onWatchPress={handleWatchNow}
          seriesTitle={series.title}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaText: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 16,
  },
  description: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 22,
    marginTop: 8,
  },
  loader: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 25,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },
  reviewsSection: {
    marginTop: 5,
    paddingBottom: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reviewsTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
  },
  addReviewButton: {
    borderWidth: 1,
    borderColor: '#ff6a00',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addReviewButtonText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    color: '#ff6a00',
    fontSize: 13,
  },
  reviewsLoader: {
    marginVertical: 15,
  },
  noReviewsText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  reviewItem: {
    backgroundColor: '#0c0c0d',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  reviewUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewUserLeft: {
    flexDirection: 'column',
  },
  reviewUserName: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownReviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reviewActionButton: {
    padding: 4,
  },
  reviewText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  uploaderRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 16,
  },
  rateButtonWithBg: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rateButtonWithBgText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#ff6a00',
    fontSize: 14,
  },
  rateRatingText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#ff6a00',
    fontSize: 14,
    marginRight: 6,
  },
  starIconWithRating: {
    marginRight: 3,
  },
  starIconWithoutRating: {
    marginRight: 4,
  },
});

export default SeriesDetailScreen;
