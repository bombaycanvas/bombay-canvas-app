import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { X, Star } from 'lucide-react-native';

const { height } = Dimensions.get('window');

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
  onSubmit,
  initialRating = 0,
  initialText = '',
  isSubmitting = false,
}) => {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState<string>('');

  const [showLocalModal, setShowLocalModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    if (visible) {
      setShowLocalModal(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (showLocalModal) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowLocalModal(false);
      });
    }
  }, [visible, showLocalModal, fadeAnim, slideAnim]);

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setText(initialText);
    }
  }, [visible, initialRating, initialText]);

  const [androidBehavior, setAndroidBehavior] = useState<'height' | undefined>(undefined);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
        setAndroidBehavior('height');
      });
      const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
        setAndroidBehavior(undefined);
      });

      return () => {
        showSubscription.remove();
        hideSubscription.remove();
      };
    }
  }, []);

  const handleSubmit = () => {
    if (rating === 0) {
      return;
    }
    onSubmit(rating, text);
  };

  return (
    <Modal
      visible={showLocalModal}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : androidBehavior}
        style={styles.keyboardAvoid}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0,0,0,0.6)',
              opacity: fadeAnim,
            },
          ]}
        />
        <Pressable style={styles.overlay} onPress={onClose}>
          <Animated.View
            style={[
              styles.container,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Pressable style={{ width: '100%' }} onPress={Keyboard.dismiss}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.headerButton}
                  onPress={onClose}
                  disabled={isSubmitting}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <X color="#fff" size={24} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.headerButton}
                  onPress={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.submitText, rating === 0 && styles.disabledSubmitText]}>
                      Submit
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.titleText}>Tap the stars to rate this drama</Text>

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
                      size={40}
                      color={starIndex <= rating ? '#f5b301' : 'rgba(255,255,255,0.4)'}
                      fill={starIndex <= rating ? '#f5b301' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Share your thoughts on the story, subtitles, voice acting, or anything else"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  value={text}
                  onChangeText={setText}
                  maxLength={800}
                  editable={!isSubmitting}
                />
                <Text style={styles.charCounter}>{text.length}/800</Text>
              </View>
            </Pressable>
          </Animated.View>
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
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    padding: 4,
  },
  submitText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 16,
  },
  disabledSubmitText: {
    color: 'rgba(255,255,255,0.3)',
  },
  titleText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  starTouch: {
    padding: 6,
  },
  inputContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 160,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontFamily: 'HelveticaNowDisplay-Regular',
    textAlignVertical: 'top',
    padding: 0,
  },
  charCounter: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
