import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Trash2, Star, Edit } from 'lucide-react-native';

interface ReviewItemProps {
  review: any;
  isOwnReview: boolean;
  currentUserName?: string;
  onEdit: (review: any) => void;
  onDelete: () => void;
}

const STARS = [1, 2, 3, 4, 5];

export const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  isOwnReview,
  currentUserName,
  onEdit,
  onDelete,
}) => (
  <View style={styles.reviewItem}>
    <View style={styles.reviewUserRow}>
      <View style={styles.reviewUserLeft}>
        <Text style={styles.reviewUserName}>
          {isOwnReview
            ? `${currentUserName || 'You'} (You)`
            : review.user?.name || 'Anonymous'}
        </Text>
        <View style={styles.starsRow}>
          {STARS.map(star => (
            <Star
              key={star}
              size={16}
              color={star <= review.rating ? '#f5b301' : 'rgba(255,255,255,0.5)'}
              fill={star <= review.rating ? '#f5b301' : 'transparent'}
              style={styles.star}
            />
          ))}
        </View>
      </View>

      {isOwnReview && (
        <View style={styles.ownReviewActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onEdit(review)}
            style={styles.reviewActionButton}
          >
            <Edit color="rgba(255,255,255,0.6)" size={20} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onDelete}
            style={styles.reviewActionButton}
          >
            <Trash2 color="#ff3b30" size={20} />
          </TouchableOpacity>
        </View>
      )}
    </View>
    {review.text ? <Text style={styles.reviewText}>{review.text}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  reviewItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.4)',
    backgroundColor: 'rgba(255,106,0,0.1)',
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
    fontSize: 16,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: { marginRight: 2 },
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
    fontSize: 15,
    lineHeight: 20,
  },
});
