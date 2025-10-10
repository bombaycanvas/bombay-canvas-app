import React, { useState, Fragment } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import ButtonIcon from '../assets/ButtonIcon';
import GoogleLogin from '../assets/GoogleLogin';
import EyeIcon from '../assets/EyeIcon';
import EyeSlashIcon from '../assets/EyeSlashIcon';
import { useForm, Controller } from 'react-hook-form';
import { useNavigation } from '@react-navigation/native';
import { useGoogleLogin, useLogin, useRequest } from '../api/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { signInWithGoogle } from '../utils/authService';
console.log('Apple Auth Supported:', appleAuth.isSupported);
type LoginScreenProps = {
  fromSignup?: boolean;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ fromSignup = false }) => {
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation();
  const { mutate: requestMutate } = useRequest();
  const { mutate: loginMutate } = useLogin();
  const { mutate: googleLoginMutate } = useGoogleLogin();
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = (data: any) => {
    fromSignup ? requestMutate(data) : loginMutate(data);
    reset();
  };

  const handleLogin = async () => {
    try {
      const firebaseToken = await signInWithGoogle();
      googleLoginMutate(firebaseToken);
    } catch (error) {
      console.error('❌ Google login error:', error);
    }
  };

  const handleAppleLogin = async () => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken, email } = appleAuthRequestResponse;

      if (!identityToken) {
        console.error('❌ Apple Sign-In failed: No identity token returned');
        return;
      }
    } catch (error) {
      console.error('❌ Apple login error:', error);
    }
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
          <Controller
            control={control}
            name="fullname"
            rules={{ required: 'Fullname is required' }}
            render={({ field: { onChange, value } }) => (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Your Fullname"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={value}
                  onChangeText={onChange}
                />
                {errors.fullname && (
                  <Text style={styles.error}>
                    {errors.fullname?.message as string}
                  </Text>
                )}
              </>
            )}
          />
        )}

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email?.message && (
                <Text style={styles.error}>
                  {errors.email.message as string}
                </Text>
              )}
            </>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{
            required: 'Password is required',
            minLength: {
              value: 8,
              message: 'Password must be at least 8 characters',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Your Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                secureTextEntry={!showPassword}
                value={value}
                onChangeText={onChange}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </TouchableOpacity>
              {errors.password && (
                <Text style={styles.error}>
                  {errors.password?.message as string}
                </Text>
              )}
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleSubmit(onSubmit)}
        >
          <Text style={styles.continueTxt}>
            {fromSignup ? 'Sign Up' : 'Log In'}
          </Text>
          <ButtonIcon />
        </TouchableOpacity>

        <View style={styles.orSection}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleLogin}>
          <GoogleLogin />
          <Text style={styles.googleTxt}>
            {fromSignup ? 'Sign in' : 'Log in'} with Google
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && (
          <TouchableOpacity style={styles.appleBtn} onPress={handleAppleLogin}>
            <Text style={styles.appleTxt}>
              {fromSignup ? 'Sign in' : 'Log in'} with Apple
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.termsWrapper}>
          <Controller
            control={control}
            name="terms"
            render={({ field: { value, onChange } }) => (
              <View style={styles.termsWrapper}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    value && { backgroundColor: '#ef8a4c' },
                  ]}
                  onPress={() => onChange(!value)}
                >
                  {value && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.bold}>Terms of Service</Text> and{' '}
                  <Text style={styles.bold}>Privacy Policy</Text>
                </Text>
              </View>
            )}
          />

          {errors.terms && (
            <Text style={styles.error}>{errors.terms?.message as string}</Text>
          )}
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
              onPress={() => navigation.navigate('Signup' as never)}
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
    paddingBottom: 6,
    paddingTop: 6,
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

  checkmark: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
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
  appleBtn: {
    borderWidth: 1,
    borderColor: '#414141',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#000',
    marginTop: 10,
  },
  appleTxt: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
});
