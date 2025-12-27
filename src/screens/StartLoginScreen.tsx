import React, { useState, useRef, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCoverVideo } from '../api/video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GoogleLogin from '../assets/GoogleLogin';
import AppleLogin from '../assets/AppleLogin';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import PhoneInput from 'react-native-international-phone-number';
import {
  useAppleLogin,
  useGoogleLogin,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useLogin,
  useRequest,
} from '../api/auth';
import { type CountryCode } from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import { signInWithGoogle } from '../utils/authService';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { useForm, Controller } from 'react-hook-form';
import EyeIcon from '../assets/EyeIcon';
import EyeSlashIcon from '../assets/EyeSlashIcon';

const { height } = Dimensions.get('window');

const StartLoginScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setHasSkipped } = useAuthStore();
  const { data } = useGetCoverVideo();

  const [flow, setFlow] = useState<'phone' | 'otp' | 'methods'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneValue, setPhoneValue] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const verifyOtpMutation = useVerifyOtpMutation();
  const { mutate: googleLoginMutate } = useGoogleLogin();
  const { mutate: appleLoginMutate } = useAppleLogin();
  const { mutate: loginMutate } = useLogin();
  const { mutate: signupMutate } = useRequest();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleSkip = async () => {
    await setHasSkipped(true);
    (navigation as any).reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const onEmailSubmit = (data: any) => {
    if (isSignup) {
      signupMutate(data);
    } else {
      loginMutate(data);
    }
  };

  const sendOtpMutation = useSendOtpMutation(response => {
    setFlow('otp');
    setTimer(30);
    Toast.show({
      type: 'success',
      text1: 'OTP Sent',
      text2: 'Please check your phone for the 6-digit code',
    });

    if (response?.otp) {
      const otpDigits = response.otp.split('');
      setTimeout(() => {
        setOtp(otpDigits);
      }, 500);

      const countryCode = (selectedCountry?.cca2 || 'IN') as CountryCode;
      const callingCode =
        selectedCountry?.callingCode || getCountryCallingCode(countryCode);
      const cleanedPhone = phoneValue.replace(/\D/g, '');
      const fullPhone = `+${callingCode}${cleanedPhone}`;

      setTimeout(() => {
        verifyOtpMutation.mutate({
          phone: fullPhone,
          otp: response.otp,
        });
      }, 1500);
    }
  });

  useEffect(() => {
    let interval: any;
    if (flow === 'otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [flow, timer]);

  useEffect(() => {
    if (flow === 'methods') {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 90,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [flow, fadeAnim, slideAnim]);

  const getCountryCallingCode = (countryCode: string = 'IN'): string => {
    const country =
      metadata.countries[countryCode as keyof typeof metadata.countries];
    return country?.[0]?.[0] || '91';
  };

  const getIsPhoneValid = (): boolean => {
    const cleanedPhone = phoneValue.replace(/\D/g, '');

    if (selectedCountry?.cca2 === 'IN' || !selectedCountry) {
      return cleanedPhone.length === 10;
    }

    return cleanedPhone.length >= 5 && cleanedPhone.length <= 15;
  };

  const handlePhoneSubmit = () => {
    const cleanedPhone = phoneValue.replace(/\D/g, '');

    const countryCode = (selectedCountry?.cca2 || 'IN') as CountryCode;
    const callingCode =
      selectedCountry?.callingCode || getCountryCallingCode(countryCode);

    const fullPhoneNumber = `+${callingCode}${cleanedPhone}`;

    sendOtpMutation.mutate({
      phone: fullPhoneNumber,
    });
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }

    if (!value && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }

    if (newOtp.every(d => d !== '') && newOtp.length === 6) {
      const cleanedPhone = phoneValue.replace(/\D/g, '');
      const callingCode = selectedCountry?.callingCode || '91';
      verifyOtpMutation.mutate({
        phone: `+${callingCode}${cleanedPhone}`,
        otp: newOtp.join(''),
      });
    }
  };

  const handleOpenURL = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
      Alert.alert('Error', 'Something went wrong while opening the link');
    }
  };

  const handlePhoneInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');

    let maxLength = 15;
    if (selectedCountry?.cca2 === 'IN') {
      maxLength = 10;
    }

    if (digitsOnly.length > maxLength) {
      const limitedDigits = digitsOnly.slice(0, maxLength);

      let formatted = limitedDigits;
      if (limitedDigits.length > 3) {
        formatted = limitedDigits.slice(0, 3) + ' ' + limitedDigits.slice(3);
      }
      if (limitedDigits.length > 6) {
        formatted =
          limitedDigits.slice(0, 3) +
          ' ' +
          limitedDigits.slice(3, 6) +
          ' ' +
          limitedDigits.slice(6);
      }

      setPhoneValue(formatted);
    } else {
      let formatted = digitsOnly;
      if (digitsOnly.length > 3) {
        formatted = digitsOnly.slice(0, 3) + ' ' + digitsOnly.slice(3);
      }
      if (digitsOnly.length > 6) {
        formatted =
          digitsOnly.slice(0, 3) +
          ' ' +
          digitsOnly.slice(3, 6) +
          ' ' +
          digitsOnly.slice(6);
      }

      setPhoneValue(formatted);
    }
  };

  const handleLogin = async () => {
    try {
      const idToken = await signInWithGoogle();
      googleLoginMutate(idToken);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Google login',
        text2: 'Something went wrong, Please try again!',
      });
    }
  };

  const handleAppleLogin = async () => {
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      const { identityToken } = appleAuthRequestResponse;

      if (!identityToken) {
        console.error('❌ Apple Sign-In failed: No identity token returned');
        return;
      }
      appleLoginMutate(identityToken);
    } catch (error) {
      console.error('❌ Apple login error:', error);
    }
  };

  const renderPhoneInput = () => (
    <View
      style={[
        styles.inputContainer,
        {
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 30),
        },
      ]}
    >
      <View style={styles.phoneInputPill}>
        <PhoneInput
          value={phoneValue}
          onChangePhoneNumber={handlePhoneInputChange}
          selectedCountry={selectedCountry}
          onChangeSelectedCountry={country => {
            setSelectedCountry(country);
            setPhoneValue('');
          }}
          defaultCountry="IN"
          placeholder="Enter Phone number"
          placeholderTextColor="rgba(255,255,255,0.4)"
          selectionColor="rgb(255,106,0)"
          phoneInputStyles={{
            container: styles.phoneInputContainer,
            flagContainer: styles.flagContainer,
            input: styles.phoneNumberInput,
            caret: styles.caret,
            divider: styles.phoneDivider,
            callingCode: styles.callingCode,
          }}
          modalStyles={{
            backdrop: {
              backgroundColor: 'transparent',
            },
            container: {
              backgroundColor: 'transparent',
            },
          }}
        />
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.submitCircle, !getIsPhoneValid() && { opacity: 0.4 }]}
          onPress={handlePhoneSubmit}
          disabled={!getIsPhoneValid() || sendOtpMutation.isPending}
        >
          {sendOtpMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.googleButton}
        onPress={handleLogin}
      >
        <GoogleLogin />
        <Text style={styles.googleButtonText}>Login using Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setFlow('methods')}
        style={styles.otherMethodsLink}
      >
        <Text style={styles.otherMethodsText}>
          Or login using another method
        </Text>
      </TouchableOpacity>

      <View style={styles.footerWrapper}>
        <Text style={styles.footerText}>
          By continuing, you accept our{' '}
          <Text
            style={styles.footerLink}
            onPress={() =>
              handleOpenURL('https://www.bombaycanvas.com/privacy-policy')
            }
          >
            Privacy Policy
          </Text>
          {' & '}
          <Text
            style={styles.footerLink}
            onPress={() =>
              handleOpenURL('https://www.bombaycanvas.com/terms-and-condition')
            }
          >
            T&C
          </Text>
        </Text>
      </View>
    </View>
  );

  const renderOtpInput = () => (
    <View
      style={[
        styles.inputContainer,
        {
          paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 30),
        },
      ]}
    >
      <View style={styles.backWrapper}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setFlow('phone')}>
          <Ionicons name="arrow-back" size={25} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.otpPillWrapper}>
        <View style={styles.otpCirclesWrapper}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                otpInputs.current[index] = ref;
              }}
              style={styles.otpCircle}
              keyboardType="number-pad"
              maxLength={1}
              value={digit}
              onChangeText={value => handleOtpChange(value, index)}
              onKeyPress={({ nativeEvent }) => {
                if (
                  nativeEvent.key === 'Backspace' &&
                  !otp[index] &&
                  index > 0
                ) {
                  otpInputs.current[index - 1]?.focus();
                }
              }}
            />
          ))}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.otpSentPill}
          disabled={verifyOtpMutation.isPending}
        >
          {verifyOtpMutation.isPending ? (
            <ActivityIndicator size="small" color="rgba(255, 106, 0, 1)" />
          ) : (
            <Text style={styles.otpSentPillText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.otpBottomInfo}>
        <Text style={styles.otpSentToText}>
          OTP sent to {selectedCountry?.callingCode} {phoneValue}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={timer > 0 || sendOtpMutation.isPending}
          onPress={() => {
            const fullPhone = `${selectedCountry?.callingCode || ''
              }${phoneValue.replace(/\s/g, '')}`;
            sendOtpMutation.mutate({ phone: fullPhone });
          }}
        >
          <Text style={[styles.timerText, timer === 0 && styles.resendActive]}>
            {timer > 0
              ? `Resend OTP in 00:${timer < 10 ? `0${timer}` : timer}`
              : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderOtherMethods = () => (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
      pointerEvents={flow === 'methods' ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          setFlow('phone');
          Keyboard.dismiss();
        }}
      >
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.methodsSheet,
          {
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 30),
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sheetHandle} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {isSignup && (
            <Controller
              control={control}
              name="fullname"
              rules={{ required: 'Fullname is required' }}
              render={({ field: { onChange, value } }) => (
                <>
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Full Name"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="words"
                  />
                  {errors.fullname && (
                    <Text style={styles.errorText}>
                      {errors.fullname.message as string}
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
                  style={styles.emailInput}
                  placeholder="Email"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={value}
                  onChangeText={onChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email?.message && (
                  <Text style={styles.errorText}>
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
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  secureTextEntry={!showPassword}
                  value={value}
                  onChangeText={onChange}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </TouchableOpacity>
              </View>
            )}
          />
          {errors.password && (
            <Text style={styles.errorText}>
              {errors.password?.message as string}
            </Text>
          )}

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.emailLoginBtn}
            onPress={handleSubmit(onEmailSubmit)}
          >
            <Text style={styles.emailLoginBtnText}>
              {isSignup ? 'Sign Up' : 'Login'}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>

        <TouchableOpacity activeOpacity={0.8} style={styles.toggleMethodsLink}>
          <Text style={styles.toggleMethodsText}>
            {isSignup ? (
              <Fragment>
                Already have an account?{' '}
                <Text
                  onPress={() => setIsSignup(!isSignup)}
                  style={styles.link}
                >
                  Login
                </Text>
              </Fragment>
            ) : (
              <Fragment>
                Don't have an account?{' '}
                <Text
                  onPress={() => setIsSignup(!isSignup)}
                  style={styles.link}
                >
                  SignUp
                </Text>
              </Fragment>
            )}
          </Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.socialButton}
              onPress={handleAppleLogin}
            >
              <AppleLogin />
              <Text style={styles.socialButtonText}>
                {isSignup ? 'Sign up using Apple' : 'Login using Apple'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.cancelLink}
          onPress={() => setFlow('phone')}
        >
          <Text style={styles.cancelLinkText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: data?.CoverUrlVideo?.url }}
        style={styles.backgroundVideo}
        resizeMode="cover"
        repeat
        muted
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,1)']}
        style={styles.overlayGradient}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.mainContent}
      >
        <View style={styles.topSection}>
          <Image
            source={require('../images/MainLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.mainTitle}>
            World’s First{'\n'}
            <Text style={styles.mainTitleBold}>
              Creator-Led Vertical OTT Platform
            </Text>
          </Text>

          <Text style={styles.para}>
            From microdramas to series in travel, food, fashion, culture and
            much more — discover it all in vertical
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.skipButton,
            { top: insets.top + (Platform.OS === 'android' ? 20 : 10) },
          ]}
          onPress={handleSkip}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {(flow === 'phone' || flow === 'methods') && renderPhoneInput()}
        {flow === 'otp' && renderOtpInput()}
        {renderOtherMethods()}
      </KeyboardAvoidingView>
    </View>
  );
};

export default StartLoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  topSection: {
    alignItems: 'flex-start',
    marginBottom: 30,
    gap: 10,
    flexDirection: 'column',
    marginHorizontal: 20,
  },
  logo: {
    width: 80,
    height: 25,
  },
  mainTitle: {
    fontFamily: 'HelveticaNowDisplay-Light',
    fontWeight: '300',
    fontSize: 30,
    color: '#fff',
    lineHeight: 36,
  },
  mainTitleBold: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 28,
  },
  para: {
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: '400',
    fontSize: 12,
    color: '#fff',
    maxWidth: '90%',
    lineHeight: 16,
  },
  inputContainer: {
    paddingHorizontal: 25,
    width: '100%',
  },
  phoneInputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 40,
    paddingLeft: 8,
    paddingRight: 8,
    height: 55,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  phoneInputContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: '100%',
  },
  flagContainer: {
    flex: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginLeft: 0,
  },
  phoneNumberInput: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Regular',
    paddingVertical: 0,
    paddingLeft: 2,
  },
  caret: {
    color: '#fff',
    fontSize: 12,
    marginTop: 0,
    marginLeft: 5,
  },
  phoneDivider: {
    backgroundColor: 'rgba(255,255,255,0.4)',
    width: 1.5,
    height: 20,
    marginHorizontal: 6,
  },
  callingCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'HelveticaNowDisplay-Bold',
    marginRight: 4,
  },
  submitCircle: {
    width: 40,
    height: 40,
    borderRadius: '100%',
    backgroundColor: 'rgba(255,106,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.5)',
  },
  otherMethodsLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  otherMethodsText: {
    color: '#fff',
    fontSize: 15,
    textDecorationLine: 'underline',
    opacity: 0.85,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  footerWrapper: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Regular',
    lineHeight: 18,
  },
  footerLink: {
    color: 'rgb(255,106,0,1)',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backWrapper: {
    marginBottom: 15,
  },
  otpPillWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 35,
    gap: 10,
  },
  otpCirclesWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  otpCircle: {
    width: 40,
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Bold',
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  otpSentPill: {
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    borderRadius: 30,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 106, 0, 0.8)',
  },
  otpSentPillText: {
    color: 'rgba(255, 106, 0, 1)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  otpBottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otpSentToText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  timerText: {
    color: 'rgba(255, 106, 0, 1)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  resendActive: {
    textDecorationLine: 'underline',
  },
  methodsSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sheetHandle: {
    width: 35,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 30,
  },
  googleButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 40,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  googleButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    fontSize: 17,
    color: '#fff',
  },
  socialButton: {
    backgroundColor: '#2C2B2F',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  socialButtonText: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    fontSize: 17,
    color: '#fff',
  },
  cancelLink: {
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.5)',
  },
  cancelLinkText: {
    color: 'rgba(255,106,0,1)',
    fontSize: 17,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  emailInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: '26%',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginTop: -10,
    marginBottom: 10,
    marginLeft: 5,
  },
  emailLoginBtn: {
    backgroundColor: 'rgba(255,106,0,1)',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.5)',
    marginBottom: 20,
  },
  emailLoginBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  termsWrapper: {
    marginBottom: 15,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  termsLink: {
    color: '#ef8a4c',
    textDecorationLine: 'underline',
  },
  toggleMethodsLink: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 5,
  },
  toggleMethodsText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    opacity: 0.8,
  },
  link: {
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    color: 'rgb(255,106,0)',
    textDecorationLine: 'underline',
    marginTop: 20,
    textAlign: 'center',
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
