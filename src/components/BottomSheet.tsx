import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Renders the orange-outline Cancel button under the content. */
  showCancel?: boolean;
}

/** Same look as the login "another method" sheet. */
const BottomSheet = ({
  visible,
  onClose,
  children,
  showCancel = true,
}: BottomSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
        >
          <View style={styles.handle} />
          {children}
          {showCancel && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BottomSheet;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingTop: 25,
    paddingHorizontal: 25,
  },
  handle: {
    width: 35,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: 'rgba(255,106,0,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.5)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#ff6a00',
    fontSize: 17,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
});
