import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useVideoStore } from '../store/videoStore';
import { useMoviesDataById } from '../api/video';
import { useReviewManager } from '../hooks/useReviewManager';
import { ReviewItem } from './ReviewItem';
import { ReviewModal } from './ReviewModal';
import { ConfirmationModal } from './ConfirmationModal';
import { WatchRequiredModal } from './WatchRequiredModal';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.7;
const DRAG_CLOSE_THRESHOLD = 100;
// lets the sheet's slide-out finish before another modal is presented
const MODAL_HANDOFF_DELAY = Platform.OS === 'ios' ? 600 : 500;

interface CommentsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  series: { id: string; title: string; posterUrl?: string } | null;
}

export const CommentsBottomSheet: React.FC<CommentsBottomSheetProps> = ({
  visible,
  onClose,
  series,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isAuthenticated, user } = useAuthStore();
  const { setIsLockedVisibleModal, setAuthRedirect } = useVideoStore();
  const [isWatchRequiredVisible, setIsWatchRequiredVisible] = useState(false);

  const seriesId = visible && series ? series.id : '';
  const {
    isReviewsLoading,
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

  // Series detail carries per-episode progress for the signed-in viewer
  const { data: seriesData, isLoading: isSeriesLoading } = useMoviesDataById(
    isAuthenticated ? seriesId : '',
  );
  const hasViewed = !!seriesData?.series?.episodes?.some(
    (ep: any) => ep.completed || (ep.progress !== undefined && ep.progress > 0),
  );

  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DRAG_CLOSE_THRESHOLD || g.vy > 1) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleAddComment = () => {
    if (!series) return;

    if (!isAuthenticated) {
      onClose();
      setAuthRedirect({
        screen: 'SeriesDetail',
        params: { id: series.id, posterUrl: series.posterUrl },
      });
      setTimeout(() => setIsLockedVisibleModal(true), MODAL_HANDOFF_DELAY);
      return;
    }

    if (myReview) {
      handleEditReview(myReview);
      return;
    }

    if (!hasViewed) {
      setIsWatchRequiredVisible(true);
      return;
    }

    setIsReviewModalVisible(true);
  };

  const handleWatchNow = () => {
    if (!series) return;
    onClose();
    navigation.navigate('Video', {
      id: series.id,
      posterUrl: series.posterUrl,
    });
  };

  const isCheckingEligibility = isAuthenticated && !myReview && isSeriesLoading;
  const commentCount = displayReviews.length;

  const renderList = () => {
    if (isReviewsLoading) {
      return (
        <ActivityIndicator size="large" color="#ff6a00" style={styles.loader} />
      );
    }

    return (
      <FlatList
        data={displayReviews}
        keyExtractor={review => review.id}
        renderItem={({ item: review }) => (
          <ReviewItem
            review={review}
            isOwnReview={!!myReview && review.id === myReview.id}
            currentUserName={user?.name}
            onEdit={handleEditReview}
            onDelete={handleDeleteReview}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No comments yet</Text>
            <Text style={styles.emptySubtitle}>Start the conversation.</Text>
          </View>
        }
      />
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View {...panResponder.panHandlers} style={styles.header}>
            <View style={styles.handle} />
            <Text style={styles.title}>
              Comments{commentCount > 0 ? ` (${commentCount})` : ''}
            </Text>
          </View>

          <View style={styles.listContainer}>{renderList()}</View>

          <View
            style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.addCommentBar}
              onPress={handleAddComment}
              disabled={isCheckingEligibility}
            >
              {isCheckingEligibility ? (
                <ActivityIndicator size="small" color="#888" />
              ) : (
                <Text style={styles.addCommentText}>
                  {myReview ? 'Edit your comment…' : 'Add a comment…'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {series && (
          <>
            <ReviewModal
              visible={isReviewModalVisible}
              onClose={() => {
                setIsReviewModalVisible(false);
                setEditingReview(null);
              }}
              seriesTitle={series.title}
              posterUrl={series.posterUrl || ''}
              onSubmit={handleReviewSubmit}
              initialRating={editingReview?.rating || 0}
              initialText={editingReview?.text || ''}
              isSubmitting={upsertReviewMutation.isPending}
            />
            <ConfirmationModal
              visible={isDeleteReviewModalVisible}
              onClose={() => setIsDeleteReviewModalVisible(false)}
              onConfirm={() => deleteReviewMutation.mutate()}
              title="Delete Comment"
              message="Are you sure you want to delete your comment?"
              confirmText="Delete"
              cancelText="Cancel"
              isDestructive
            />
            <WatchRequiredModal
              visible={isWatchRequiredVisible}
              onClose={() => setIsWatchRequiredVisible(false)}
              onWatchPress={handleWatchNow}
              seriesTitle={series.title}
            />
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: '#121212',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  loader: {
    marginTop: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 18,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  addCommentBar: {
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#262629',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  addCommentText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
