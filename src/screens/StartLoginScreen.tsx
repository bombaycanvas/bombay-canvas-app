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
  TouchableWithoutFeedback,
  Keyboard,
  Animated,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetCoverVideo } from '../api/video';
import { useVideoCache } from '../hooks/useVideoCache';
import Ionicons from 'react-native-vector-icons/Ionicons';
import GoogleLogin from '../assets/GoogleLogin';
import Toast from 'react-native-toast-message';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { postAuthRoute } from '../utils/postAuthRoute';
import PhoneInput from 'react-native-international-phone-number';
import {
  useAppleLogin,
  useForgotPassword,
  useGoogleLogin,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useLogin,
  useRequest,
} from '../api/auth';
import { type CountryCode } from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import { signInWithApple, signInWithGoogle } from '../utils/authService';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import { useForm, Controller } from 'react-hook-form';
import EyeIcon from '../assets/EyeIcon';
import EyeSlashIcon from '../assets/EyeSlashIcon';
import handleOpenURL from '../services/handleOpenUrl';
import { usePostHog } from 'posthog-react-native';
import { PostHogMaskView } from '../utils/analytics';

const { height } = Dimensions.get('window');

const renderCustomFlag = (country: any) => {
  const cca2 = country?.cca2;
  if (!cca2) {
    return null;
  }
  return (
    <Image
      source={{
        uri: `https://flagcdn.com/w80/${cca2.toLowerCase()}.png`,
      }}
      style={styles.customFlagImage}
      resizeMode="contain"
    />
  );
};

const EMAIL_RULES = {
  required: 'Email is required',
  pattern: {
    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
    message: 'Invalid email address',
  },
};

// The backend omits `message` when no account matches, to avoid user enumeration.
const DEFAULT_RESET_SENT_MESSAGE =
  'If an account exists for this email, a reset link has been sent. Please check your inbox.';

const RESEND_COOLDOWN_SECONDS = 30;

type ResetLinkSentProps = {
  email: string;
  message: string;
  cooldown: number;
  isResending: boolean;
  onResend: () => void;
  onBackToLogin: () => void;
};

const ResetLinkSent = ({
  email,
  message,
  cooldown,
  isResending,
  onResend,
  onBackToLogin,
}: ResetLinkSentProps) => (
  <View>
    <Text style={styles.sentTitle}>Check your email</Text>
    <Text style={styles.sentMessage}>{message}</Text>

    <View style={styles.sentEmailRow}>
      <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.5)" />
      <PostHogMaskView style={styles.sentEmailMask}>
        <Text style={styles.sentEmail} numberOfLines={1} ellipsizeMode="middle">
          {email}
        </Text>
      </PostHogMaskView>
    </View>

    <Text style={styles.sentHint}>
      The link expires in 1 hour. If you don't see it, check your spam folder.
    </Text>

    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.emailLoginBtn}
      onPress={onBackToLogin}
    >
      <Text style={styles.emailLoginBtnText}>Back to Login</Text>
    </TouchableOpacity>

    <View style={styles.resendRow}>
      <Text style={styles.resendPrompt}>Didn't receive it?</Text>
      {isResending ? (
        <ActivityIndicator size="small" color="rgb(255,106,0)" />
      ) : (
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={8}
          disabled={cooldown > 0}
          onPress={onResend}
        >
          <Text
            style={[
              styles.resendAction,
              cooldown > 0 && styles.resendActionDisabled,
            ]}
          >
            {cooldown > 0
              ? `Resend in 0:${String(cooldown).padStart(2, '0')}`
              : 'Resend'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const ForgotPasswordForm = ({
  onSent,
  onBackToLogin,
}: {
  onSent: () => void;
  onBackToLogin: () => void;
}) => {
  const [sent, setSent] = useState<{ email: string; message: string } | null>(
    null,
  );
  const [cooldown, setCooldown] = useState(0);
  const { mutate, isPending } = useForgotPassword();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>();

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timeout = setTimeout(() => setCooldown(prev => prev - 1), 1000);
    return () => clearTimeout(timeout);
  }, [cooldown]);

  const sendResetLink = (email: string) =>
    mutate(
      { email },
      {
        onSuccess: data => {
          setSent({
            email: email.trim(),
            message: data?.message || DEFAULT_RESET_SENT_MESSAGE,
          });
          setCooldown(RESEND_COOLDOWN_SECONDS);
          onSent();
        },
      },
    );

  if (sent) {
    return (
      <ResetLinkSent
        email={sent.email}
        message={sent.message}
        cooldown={cooldown}
        isResending={isPending}
        onResend={() => sendResetLink(sent.email)}
        onBackToLogin={onBackToLogin}
      />
    );
  }

  return (
    <View>
      <Text style={styles.forgotInfoText}>
        Enter your email and we'll send you a link to reset your password
      </Text>

      <Controller
        control={control}
        name="email"
        rules={EMAIL_RULES}
        render={({ field: { onChange, value } }) => (
          <>
            <PostHogMaskView>
              <TextInput
                style={styles.emailInput}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={value}
                onChangeText={onChange}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </PostHogMaskView>
            {errors.email?.message && (
              <Text style={styles.errorText}>{errors.email.message}</Text>
            )}
          </>
        )}
      />

      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.emailLoginBtn}
        disabled={isPending}
        onPress={handleSubmit(({ email }) => sendResetLink(email))}
      >
        {isPending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.emailLoginBtnText}>Send Reset Link</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const StartLoginScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const redirect = route.params?.redirect;
  const { setHasSkipped } = useAuthStore();
  const { data } = useGetCoverVideo();
  const videoUrl = useVideoCache(data?.CoverUrlVideo?.url);
  console.log('data', data);
  const [flow, setFlow] = useState<'phone' | 'otp' | 'methods'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneValue, setPhoneValue] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [showPassword, setShowPassword] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isResetLinkSent, setIsResetLinkSent] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const otpInputs = useRef<Array<TextInput | null>>([]);
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const verifyOtpMutation = useVerifyOtpMutation(redirect);
  const { mutate: googleLoginMutate } = useGoogleLogin(redirect);
  const { mutate: appleLoginMutate } = useAppleLogin(redirect);
  const { mutate: loginMutate } = useLogin(redirect);
  const { mutate: signupMutate } = useRequest(redirect);

  const posthog = usePostHog()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const exitForgotMode = () => {
    setIsForgotMode(false);
    setIsResetLinkSent(false);
  };

  const closeMethodsSheet = () => {
    setFlow('phone');
    exitForgotMode();
    Keyboard.dismiss();
  };

  const handleSkip = async () => {
    await setHasSkipped(true);
    (navigation as any).reset({
      index: 0,
      routes: [{ name: postAuthRoute() }],
    });
  };

  const onEmailSubmit = (data: any) => {

    if (isSignup) {
        posthog.capture('signup', { method: 'email' });
      signupMutate(data);
    } else {
      loginMutate(data);
    }
  };

  const sendOtpMutation = useSendOtpMutation(response => {
    setFlow('otp');
    setOtp(['', '', '', '']);
    setActiveIndex(0);
    setTimer(30);
    Toast.show({
      type: 'success',
      text1: 'OTP Sent',
      text2: 'Please check your phone for the 4-digit code',
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
      Keyboard.dismiss();
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
    return country?.[0] || '91';
  };
  const getFullPhoneNumber = () => {
    const cleanedPhone = phoneValue.replace(/\D/g, '');

    const callingCode = Array.isArray(selectedCountry?.callingCode)
      ? selectedCountry.callingCode[0]
      : selectedCountry?.callingCode ||
        getCountryCallingCode((selectedCountry?.cca2 || 'IN') as CountryCode);

    return `+${callingCode}${cleanedPhone}`;
  };

  const getIsPhoneValid = (): boolean => {
    const cleanedPhone = phoneValue.replace(/\D/g, '');

    if (selectedCountry?.cca2 === 'IN' || !selectedCountry) {
      return cleanedPhone.length === 10;
    }

    return cleanedPhone.length >= 5 && cleanedPhone.length <= 15;
  };

  const handlePhoneSubmit = () => {
    const fullPhoneNumber = getFullPhoneNumber();

    sendOtpMutation.mutate({
      phone: fullPhoneNumber,
    });
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
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Google login failed',
        text2: error?.message || 'Something went wrong, Please try again!',
      });
    }
  };

  const handleAppleLogin = async () => {
    try {
      const identityToken = await signInWithApple();
      if (identityToken) {
        appleLoginMutate(identityToken);
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Apple login failed',
        text2: error?.message || 'Something went wrong, Please try again!',
      });
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
      <PostHogMaskView style={styles.phoneInputPill}>
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
          customFlag={renderCustomFlag}
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
      </PostHogMaskView>

      {Platform.OS === 'ios' && (
        <AppleButton
          buttonStyle={AppleButton.Style.WHITE}
          buttonType={AppleButton.Type.CONTINUE}
          style={styles.appleButton}
          cornerRadius={25}
          onPress={handleAppleLogin}
        />
      )}

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
        onPress={() => {
          Keyboard.dismiss();
          setTimeout(() => {
            setFlow('methods');
          }, 50);
        }}
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
              handleOpenURL('https://canvasott.com/privacy-policy')
            }
          >
            Privacy Policy
          </Text>
          {' & '}
          <Text
            style={styles.footerLink}
            onPress={() =>
              handleOpenURL('https://canvasott.com/terms-and-condition')
            }
          >
            T&C
          </Text>
        </Text>
      </View>
    </View>
  );

  const renderOtpInput = () => {
    return (
      <View
        style={[
          styles.inputContainer,
          {
            paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 20 : 30),
          },
        ]}
      >
        <View style={styles.backWrapper}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setOtp(['', '', '', '']);
              setActiveIndex(0);
              setFlow('phone');
            }}
          >
            <Ionicons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
        <TextInput
          ref={ref => {
            otpInputs.current[0] = ref;
          }}
          value={otp.join('')}
          onChangeText={text => {
            const cleaned = text.replace(/\D/g, '').slice(0, 4);
            console.log('OTP:', cleaned);
            const otpArray = cleaned.split('');
            while (otpArray.length < 4) otpArray.push('');
            setOtp(otpArray);
            if (cleaned.length < 4) {
              setActiveIndex(cleaned.length);
            } else {
              setActiveIndex(3);
            }
            if (cleaned.length === 4) {
              verifyOtpMutation.mutate({
                phone: getFullPhoneNumber(),
                otp: cleaned,
              });
            }
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={4}
          autoFocus
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            left: -1000,
          }}
          pointerEvents="none"
        />
        <View style={styles.otpPillWrapper}>
          {/* Masks the digit Text nodes, not the input: the real <TextInput> is
              offscreen at opacity 0, so masking it would protect nothing. */}
          <PostHogMaskView style={styles.otpCirclesWrapper}>
            {[0, 1, 2, 3].map((_, index) => {
              const isActive = index === activeIndex;

              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => {
                    otpInputs.current[0]?.focus();
                    setActiveIndex(index);
                  }}
                >
                  <View
                    style={[
                      styles.otpCircle,
                      isActive && styles.activeOtpCircle,
                    ]}
                  >
                    <Text style={styles.otpText}>{otp[index] || ''}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </PostHogMaskView>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.otpSentPill}
            onPress={() => {
              const fullOtp = otp.join('');
              if (fullOtp.length === 4) {
                verifyOtpMutation.mutate({
                  phone: getFullPhoneNumber(),
                  otp: fullOtp,
                });
              }
            }}
            disabled={verifyOtpMutation.isPending || otp.join('').length !== 4}
          >
            {verifyOtpMutation.isPending ? (
              <ActivityIndicator size="small" color="rgba(255, 106, 0, 1)" />
            ) : (
              <Text style={styles.otpSentPillText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.otpBottomInfo}>
          <PostHogMaskView>
            <Text style={styles.otpSentToText}>
              OTP sent to {selectedCountry?.callingCode} {phoneValue}
            </Text>
          </PostHogMaskView>

          <TouchableOpacity
            activeOpacity={0.8}
            disabled={timer > 0 || sendOtpMutation.isPending}
            onPress={() => {
              const fullPhoneNumber = getFullPhoneNumber();
              sendOtpMutation.mutate({ phone: fullPhoneNumber });
            }}
          >
            <Text
              style={[styles.timerText, timer === 0 && styles.resendActive]}
            >
              {timer > 0
                ? `Resend OTP in 00:${timer < 10 ? `0${timer}` : timer}`
                : 'Resend OTP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOtherMethods = () => (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
      pointerEvents={flow === 'methods' ? 'auto' : 'none'}
    >
      <TouchableWithoutFeedback onPress={closeMethodsSheet}>
        <Animated.View style={[styles.modalBackdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.methodsSheetKAV}
      >
        <Animated.View
          style={[
            styles.methodsSheet,
            {
              // paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 10 : 20),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          {isForgotMode ? (
            <ForgotPasswordForm
              onSent={() => setIsResetLinkSent(true)}
              onBackToLogin={exitForgotMode}
            />
          ) : (
            <View>
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
                rules={EMAIL_RULES}
                render={({ field: { onChange, value } }) => (
                  <>
                    <PostHogMaskView>
                      <TextInput
                        style={styles.emailInput}
                        placeholder="Email"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={value}
                        onChangeText={onChange}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </PostHogMaskView>
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
                  <PostHogMaskView style={styles.passwordContainer}>
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
                  </PostHogMaskView>
                )}
              />
              {errors.password && (
                <Text style={styles.errorText}>
                  {errors.password?.message as string}
                </Text>
              )}

              {!isSignup && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.forgotLink}
                  hitSlop={8}
                  onPress={() => setIsForgotMode(true)}
                >
                  <Text style={styles.forgotLinkText}>Forgot Password?</Text>
                </TouchableOpacity>
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
            </View>
          )}

          {!isResetLinkSent && (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.toggleMethodsLink}
              >
                <Text style={styles.toggleMethodsText}>
                  {isForgotMode ? (
                    <Fragment>
                      Remembered it?{' '}
                      <Text onPress={exitForgotMode} style={styles.link}>
                        Login
                      </Text>
                    </Fragment>
                  ) : isSignup ? (
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
                        Sign Up
                      </Text>
                    </Fragment>
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelLink}
                onPress={closeMethodsSheet}
              >
                <Text style={styles.cancelLinkText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Video
          useTextureView={false}
          source={{ uri: videoUrl }}
          style={styles.backgroundVideo}
          resizeMode="cover"
          repeat
          muted
          playWhenInactive={true}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,1)']}
          style={styles.overlayGradient}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                Creator Led Short Form Shows
              </Text>
            </Text>

            <Text style={styles.para}>
              Microdramas. Anime. Documentaries. Food. Fashion. Travel. Comedy.
              And more - All In Short Form
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
    </TouchableWithoutFeedback>
  );
};

export default StartLoginScreen;

const styles = StyleSheet.create({
  customFlagImage: {
    width: 24,
    height: 16,
    marginRight: 6,
    borderRadius: 2,
  },
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
    height: 40,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  methodsSheetKAV: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  methodsSheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    padding: 25,
    // position: 'absolute',
    // bottom: 0,
    // left: 0,
    // right: 0,
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
  appleButton: {
    width: '100%',
    height: 50,
    marginTop: 10,
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
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 15,
  },
  forgotLinkText: {
    color: 'rgb(255,106,0)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  forgotInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginBottom: 20,
  },
  sentTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
    marginBottom: 8,
  },
  sentMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginBottom: 20,
  },
  sentEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 15,
  },
  sentEmailMask: {
    flex: 1,
  },
  sentEmail: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  sentHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'HelveticaNowDisplay-Regular',
    marginBottom: 20,
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -5,
    marginBottom: 20,
  },
  resendPrompt: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  resendAction: {
    color: 'rgb(255,106,0)',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: '700',
  },
  resendActionDisabled: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: '400',
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
    backgroundColor: 'transparent',
    borderRadius: 18,
    opacity: 0.4,
  },
  activeOtpCircle: {
    borderColor: 'rgba(255,106,0,1)',
    borderWidth: 2,
    shadowColor: 'rgba(255,106,0,0.8)',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },

  otpText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
