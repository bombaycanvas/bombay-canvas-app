import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Plus } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { ReviewModal } from '../components/ReviewModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { WatchRequiredModal } from '../components/WatchRequiredModal';
import { ReviewItem } from '../components/ReviewItem';
import { useReviewManager } from '../hooks/useReviewManager';

type RootStackParamList = {
  Reviews: {
    seriesId: string;
    seriesTitle: string;
    posterUrl?: string;
    hasViewed: boolean;
  };
};

const ReviewsScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'Reviews'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { seriesId, seriesTitle, posterUrl, hasViewed } = route.params;
  const [isWatchRequiredModalVisible, setIsWatchRequiredModalVisible] = useState(false);

  const handleWatchNow = () => {
    navigation.replace('Video', {
      id: seriesId,
      posterUrl,
    });
  };

  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  const {
    isReviewsLoading,
    refetchReviews,
    isFetching,
    upsertReviewMutation,
    deleteReviewMutation,
    isReviewModalVisible,
    setIsReviewModalVisible,
    isDeleteReviewModalVisible,
    setIsDeleteReviewModalVisible,
    editingReview,
    setEditingReview,
    handleEditReview,
    handleDeleteReview,
    handleReviewSubmit,
    myReview,
    displayReviews,
  } = useReviewManager(seriesId);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onRefresh = useCallback(() => {
    refetchReviews();
  }, [refetchReviews]);

  return (
    <View style={styles.mainContainer}>
      <View style={StyleSheet.absoluteFillObject} />
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#fff" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>Reviews</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{seriesTitle}</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isReviewsLoading}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
      >
        {isReviewsLoading ? (
          <ActivityIndicator size="large" color="#ff6a00" style={styles.loader} />
        ) : displayReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No reviews yet. Be the first to leave one!</Text>
            {isAuthenticated && !myReview && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.emptyStateAddButton}
                onPress={() => {
                  if (!hasViewed) {
                    setIsWatchRequiredModalVisible(true);
                  } else {
                    setIsReviewModalVisible(true);
                  }
                }}
              >
                <Plus size={20} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateAddButtonText}>Write a Review</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          displayReviews.map((review: any) => (
            <ReviewItem
              key={review.id}
              review={review}
              isOwnReview={!!myReview && review.id === myReview.id}
              currentUserName={user?.name}
              onEdit={handleEditReview}
              onDelete={handleDeleteReview}
            />
          ))
        )}
      </ScrollView>
      <ReviewModal
        visible={isReviewModalVisible}
        onClose={() => {
          setIsReviewModalVisible(false);
          setEditingReview(null);
        }}
        seriesTitle={seriesTitle}
        posterUrl={posterUrl || ''}
        onSubmit={handleReviewSubmit}
        initialRating={editingReview?.rating || 0}
        initialText={editingReview?.text || ''}
        isSubmitting={upsertReviewMutation.isPending}
      />
      <ConfirmationModal
        visible={isDeleteReviewModalVisible}
        onClose={() => setIsDeleteReviewModalVisible(false)}
        onConfirm={() => {
          deleteReviewMutation.mutate();
        }}
        title="Delete Review"
        message="Are you sure you want to delete your review?"
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive={true}
      />
      <WatchRequiredModal
        visible={isWatchRequiredModalVisible}
        onClose={() => setIsWatchRequiredModalVisible(false)}
        onWatchPress={handleWatchNow}
        seriesTitle={seriesTitle}
      />
    </View>
  );
};

export default ReviewsScreen;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 36,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6a00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStateAddButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 14,
  },
});
