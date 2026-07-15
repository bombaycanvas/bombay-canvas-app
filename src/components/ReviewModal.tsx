import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Pressable,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { X, Star } from 'lucide-react-native';
import { imgUrl } from '../api/video';


interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  seriesTitle: string;
  posterUrl: string;
  onSubmit: (rating: number, text: string) => Promise<void>;
  initialRating?: number;
  initialText?: string;
  isSubmitting?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  visible,
  onClose,
  seriesTitle,
  posterUrl,
  onSubmit,
  initialRating = 0,
  initialText = '',
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setText(initialText);
    }
  }, [visible, initialRating, initialText]);

  const handleSubmit = () => {
    if (rating === 0) {
      return;
    }
    onSubmit(rating, text);
  };

  const isEditing = initialRating > 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Pressable style={styles.overlay} onPress={Keyboard.dismiss}>
          <View style={styles.container} onStartShouldSetResponder={() => true}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.closeButton}
              onPress={onClose}
              disabled={isSubmitting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X color="rgba(255,255,255,0.7)" size={20} />
            </TouchableOpacity>

            {posterUrl ? (
              <FastImage
                source={{
                  uri: imgUrl(posterUrl, 300),
                  priority: FastImage.priority.high,
                }}
                style={styles.poster}
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : null}

            <Text style={styles.title}>
              {isEditing
                ? `Edit your review for "${seriesTitle}" !`
                : `Add your review for "${seriesTitle}" !`}
            </Text>
            <Text style={styles.subtitle}>How was it? Leave a rating.</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((starIndex) => (
                <TouchableOpacity
                  key={starIndex}
                  activeOpacity={0.7}
                  style={styles.starTouch}
                  onPress={() => setRating(starIndex)}
                  disabled={isSubmitting}
                >
                  <Star
                    size={36}
                    color={starIndex <= rating ? '#f5b301' : 'rgba(255,255,255,0.5)'}
                    fill={starIndex <= rating ? '#f5b301' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Share what you thought (optional)"
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={4}
              value={text}
              onChangeText={setText}
              maxLength={500}
              editable={!isSubmitting}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.button,
                  styles.submitButton,
                  rating === 0 && styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Save Review' : 'Post Review'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[styles.button, styles.skipButton]}
                onPress={onClose}
                disabled={isSubmitting}
              >
                <Text style={styles.skipButtonText}>
                  {isEditing ? 'Cancel' : 'Skip'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#121212',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  closeButton: {
    position: 'absolute',
    right: 18,
    top: 18,
    zIndex: 10,
  },
  poster: {
    width: 90,
    height: 120,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  starTouch: {
    padding: 4,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#ff6a00',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,106,0,0.4)',
  },
  submitButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 15,
  },
  skipButton: {
    backgroundColor: '#262629',
  },
  skipButtonText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    color: '#aaa',
    fontSize: 15,
  },
});
