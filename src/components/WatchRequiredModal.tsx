import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

interface WatchRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  onWatchPress: () => void;
  seriesTitle: string;
}

export const WatchRequiredModal: React.FC<WatchRequiredModalProps> = ({
  visible,
  onClose,
  onWatchPress,
  seriesTitle,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Please watch the series</Text>
          <Text style={styles.subtitle}>
            Before you can leave a comment or review, you must view at least one episode of "{seriesTitle}".
          </Text>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.button, styles.watchButton]}
            onPress={() => {
              onClose();
              onWatchPress();
            }}
          >
            <Text style={styles.watchText}>Watch Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  watchButton: {
    backgroundColor: '#ff6a00',
  },
  watchText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#262629',
    marginBottom: 0,
  },
  cancelText: {
    fontFamily: 'HelveticaNowDisplay-Medium',
    color: '#aaa',
    fontSize: 16,
  },
});
