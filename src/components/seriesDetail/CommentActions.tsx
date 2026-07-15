import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface CommentActionsProps {
  isAuthenticated: boolean;
  myReview: any;
  onWriteComment: () => void;
  onShowComments: () => void;
}

export const CommentActions: React.FC<CommentActionsProps> = ({
  isAuthenticated,
  myReview,
  onWriteComment,
  onShowComments,
}) => {
  if (!isAuthenticated) return null;

  return (
    <View style={styles.commentButtonsRow}>
      {!myReview && (
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.commentButton, styles.writeCommentButton]}
          onPress={onWriteComment}
        >
          <Text style={styles.writeCommentText}>Write Comment</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.commentButton,
          myReview ? styles.showCommentButtonFull : styles.showCommentButton,
        ]}
        onPress={onShowComments}
      >
        <Text style={styles.showCommentText}>Show Comment</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  commentButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 0,
    marginBottom: 16,
    width: '100%',
  },
  commentButton: {
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeCommentButton: {
    flex: 1,
    backgroundColor: '#ff6a00',
  },
  showCommentButton: {
    flex: 1,
    backgroundColor: '#262629',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  showCommentButtonFull: {
    width: '100%',
    backgroundColor: '#262629',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  writeCommentText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 14,
  },
  showCommentText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    color: '#fff',
    fontSize: 14,
  },
});
