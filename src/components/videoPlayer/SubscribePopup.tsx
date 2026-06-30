import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useVideoStore } from '../../store/videoStore';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import LockOutlined from '../../assets/LockOutlined';

export function SubscribePopup() {
  const navigation = useNavigation<NavigationProp<any>>();
  const { isPurchaseModal, setIsPurchaseModal, purchaseSeries } = useVideoStore();

  const close = () => {
    setIsPurchaseModal(false);
  };

  const handleSubscribe = () => {
    setIsPurchaseModal(false);
    navigation.navigate('SubscriptionScreen', { series: purchaseSeries });
  };

  return (
    <Modal
      visible={isPurchaseModal}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <LockOutlined width={35} height={35} color="#FF5A00" />
          </View>
          <Text style={styles.title}>Subscribe to watch</Text>
          <Text style={styles.subtitle}>
            To watch all episodes of this series, subscribe to Canvas premium.
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.button, styles.subscribeButton]}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeText}>Subscribe Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cancelButton}
            onPress={close}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 90, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 0, 0.4)',

  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: '#FF5A00',
  },
  subscribeText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 16,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    width: '100%',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: '#aaa',
    fontSize: 15,
  },
});
