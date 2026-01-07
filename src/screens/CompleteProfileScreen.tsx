import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { completeProfileRequest } from '../api/auth';

const CompleteProfileScreen = () => {
  const navigation = useNavigation();
  const { setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCompleteProfile = async () => {
    if (!name) {
      Toast.show({
        type: 'error',
        text1: 'Required Field',
        text2: 'Please enter your name',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await completeProfileRequest({
        name,
        avatarUrl: null,
      });

      if (response && response.success) {
        setUser(response.user);
        Toast.show({
          type: 'success',
          text1: 'Welcome!',
          text2: 'Profile completed successfully',
        });
        (navigation as any).navigate('MainTabs');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <LinearGradient colors={['#1a1a1a', '#000']} style={styles.gradient} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Complete Profile</Text>
            <Text style={styles.subtitle}>Tell us a bit about yourself</Text>
          </View>

          <View style={styles.inputContainer}>
            {/* Name Input */}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="person-outline"
                size={20}
                color="rgba(255,255,255,0.5)"
              />
              <TextInput
                style={styles.textInput}
                placeholder="Full Name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.submitButton,
                !name && styles.disabledButton,
              ]}
              onPress={handleCompleteProfile}
              disabled={isSubmitting || !name}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default CompleteProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 10,
  },
  inputContainer: {
    gap: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    paddingHorizontal: 10,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  submitButton: {
    backgroundColor: 'rgba(255,106,0,1)',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: 'rgba(255,106,0,1)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,106,0,0.5)',
    shadowOpacity: 0,
  },
});
