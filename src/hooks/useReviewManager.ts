import { useState } from 'react';
import { useSeriesReviews, useUpsertReview, useDeleteReview } from '../api/engagement';

export const useReviewManager = (seriesId: string) => {
  const {
    data: reviewsData,
    isLoading: isReviewsLoading,
    refetch: refetchReviews,
    isFetching,
  } = useSeriesReviews(seriesId);

  const upsertReviewMutation = useUpsertReview(seriesId);
  const deleteReviewMutation = useDeleteReview(seriesId);

  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [isDeleteReviewModalVisible, setIsDeleteReviewModalVisible] = useState(false);
  const [editingReview, setEditingReview] = useState<{ rating: number; text: string } | null>(null);

  const handleEditReview = (review: any) => {
    setEditingReview({
      rating: review.rating,
      text: review.text || '',
    });
    setIsReviewModalVisible(true);
  };

  const handleDeleteReview = () => {
    setIsDeleteReviewModalVisible(true);
  };

  const handleReviewSubmit = async (rating: number, text: string) => {
    try {
      await upsertReviewMutation.mutateAsync({ rating, text });
      setIsReviewModalVisible(false);
      setEditingReview(null);
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const myReview = reviewsData?.myReview;
  const allReviews = reviewsData?.reviews || [];
  const displayReviews = myReview
    ? [myReview, ...allReviews.filter((r: any) => r.id !== myReview.id)]
    : allReviews;

  return {
    reviewsData,
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
    allReviews,
    displayReviews,
  };
};
