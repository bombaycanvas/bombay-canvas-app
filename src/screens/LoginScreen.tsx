import React, { useState, Fragment } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import ButtonIcon from '../assets/ButtonIcon';
import GoogleLogin from '../assets/GoogleLogin';
import EyeIcon from '../assets/EyeIcon';
import EyeSlashIcon from '../assets/EyeSlashIcon';
import { useForm } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';

type LoginScreenProps = {
  fromSignup?: boolean;
  onGoogleLogin: () => void;
  onSubmitForm: (data: any, fromSignup: boolean) => void;
};

const LoginScreen: React.FC<LoginScreenProps> = ({
  fromSignup = false,
  onGoogleLogin,
  onSubmitForm,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const onSubmit = (data: any) => {
    if (onSubmitForm) onSubmitForm(data, fromSignup);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleSection}>
        <Text style={styles.mainTitle}>
          {fromSignup ? (
            <>
              Let&apos;s Get <Text style={styles.bold}>You Started</Text>
            </>
          ) : (
            <>
              Welcome <Text style={styles.bold}>Back!</Text>
            </>
          )}
        </Text>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Your Information</Text>

        {fromSignup && (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Your Fullname"
              placeholderTextColor="rgba(255,255,255,0.3)"
              onChangeText={text => setValue('fullname', text)}
            />
            {errors.fullname && (
              <Text style={styles.error}>Fullname is required</Text>
            )}
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255,255,255,0.3)"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={text => setValue('email', text)}
        />
        {errors.email && (
          <Text style={styles.error}>
            {typeof errors.email.message === 'string'
              ? errors.email.message
              : 'Email is invalid'}
          </Text>
        )}

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Your Password"
            placeholderTextColor="rgba(255,255,255,0.3)"
            secureTextEntry={!showPassword}
            onChangeText={text => setValue('password', text)}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </TouchableOpacity>
        </View>
        {errors.password && (
          <Text style={styles.error}>
            {typeof errors.password.message === 'string'
              ? errors.password.message
              : 'Password is invalid'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.continueTxt}>
            {fromSignup ? 'Sign Up' : 'Log In'}
          </Text>
          <ButtonIcon />
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.orSection}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={onGoogleLogin}>
          <GoogleLogin />
          <Text style={styles.googleTxt}>
            {fromSignup ? 'Sign in' : 'Log in'} with Google
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <View style={styles.termsWrapper}>
          <View style={styles.checkbox} />
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.bold}>Terms of Service</Text> and{' '}
            <Text style={styles.bold}>Privacy Policy</Text>
          </Text>
        </View>
      </View>

      <Text style={styles.extraTxt}>
        {fromSignup ? (
          <Fragment>
            Already have an account?{' '}
            <Text
              onPress={() => navigation.navigate('Login' as never)}
              style={styles.link}
            >
              Log in
            </Text>
          </Fragment>
        ) : (
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
            Don’t have an account?{' '}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('SignUp' as never)}
            >
              Sign Up
            </Text>
          </Text>
        )}
      </Text>
    </ScrollView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#202020',
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 30,
    alignItems: 'center',
  },
  mainTitle: {
    fontFamily: 'HelveticaNowDisplay-Light',
    fontWeight: 300,
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
  },
  button: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bold: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
  },
  formSection: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 6,
    borderColor: 'rgba(54, 54, 54, 0.37)',
    backgroundColor: 'rgba(32, 32, 32, 0.7)',
  },
  label: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    fontSize: 12,
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#353535',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    color: '#fff',
    marginBottom: 10,
  },
  passwordWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '35%',
  },
  error: {
    color: 'red',
    fontSize: 12,
  },
  continueBtn: {
    backgroundColor: '#ef8a4c',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueTxt: {
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    fontSize: 14,
    marginRight: 6,
  },
  orSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    justifyContent: 'center',
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#fff',
    opacity: 0.3,
  },
  orText: {
    marginHorizontal: 10,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#414141',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  googleTxt: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  termsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ef8a4c',
  },
  termsText: {
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    color: 'rgba(255,255,255,0.65)',
  },
  extraTxt: {
    marginTop: 20,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  link: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
    color: '#fff',
    textDecorationLine: 'underline',
    marginTop: 20,
    textAlign: 'center',
  },
});
