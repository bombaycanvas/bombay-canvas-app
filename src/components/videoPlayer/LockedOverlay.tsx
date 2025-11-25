import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useVideoStore } from '../../store/videoStore';
import { NavigationProp, useNavigation } from '@react-navigation/native';

export function LockedOverlay() {
  const navigation = useNavigation<NavigationProp<any>>();

  const { isLockedVisibleModal, setIsLockedVisibleModal } = useVideoStore();

  const close = () => setIsLockedVisibleModal(false);

  return (
    <Modal
      visible={isLockedVisibleModal}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Sign up to watch this episode</Text>
          <Text style={styles.subtitle}>
            You need to create an account or log in to continue.
          </Text>

          <TouchableOpacity
            style={[styles.button, styles.signUpButton]}
            onPress={() => {
              close();
              navigation.navigate('Signup');
            }}
          >
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.loginButton]}
            onPress={() => {
              close();
              navigation.navigate('Login');
            }}
          >
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={close}>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  signUpButton: {
    backgroundColor: '#FF5A00',
  },
  signUpText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    color: '#fff',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#333',
  },
  loginText: {
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    color: '#aaa',
    fontSize: 15,
  },
});
