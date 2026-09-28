import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
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
  useGoogleLogin,
  useSendOtpMutation,
  useVerifyOtpMutation,
} from '../api/auth';
import OtpInput from '../components/OtpInput';
import { useResendTimer } from '../hooks/useResendTimer';
import { type CountryCode } from 'libphonenumber-js';
import metadata from 'libphonenumber-js/metadata.min.json';
import { signInWithApple, signInWithGoogle } from '../utils/authService';
import { AppleButton } from '@invertase/react-native-apple-authentication';
import handleOpenURL from '../services/handleOpenUrl';
import { PostHogMaskView } from '../utils/analytics';

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

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 4;

const StartLoginScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const redirect = route.params?.redirect;
  const { setHasSkipped } = useAuthStore();
  const { data } = useGetCoverVideo();
  const videoUrl = useVideoCache(data?.CoverUrlVideo?.url);
  console.log('data', data);
  const [flow, setFlow] = useState<'phone' | 'otp'>('phone');
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [phoneValue, setPhoneValue] = useState('');
  const [otp, setOtp] = useState('');

  const resendTimer = useResendTimer(RESEND_COOLDOWN_SECONDS, flow === 'otp');

  const verifyOtpMutation = useVerifyOtpMutation(redirect);
  const { mutate: googleLoginMutate } = useGoogleLogin(redirect);
  const { mutate: appleLoginMutate } = useAppleLogin(redirect);

  const handleSkip = async () => {
    await setHasSkipped(true);
    (navigation as any).reset({
      index: 0,
      routes: [{ name: postAuthRoute() }],
    });
  };

  const sendOtpMutation = useSendOtpMutation(response => {
    setFlow('otp');
    setOtp('');
    resendTimer.restart();
    Toast.show({
      type: 'success',
      text1: 'OTP Sent',
      text2: 'Please check your phone for the 4-digit code',
    });

    if (response?.otp) {
      setTimeout(() => {
        setOtp(response.otp);
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
              setOtp('');
              setFlow('phone');
            }}
          >
            <Ionicons name="arrow-back" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
        <OtpInput
          value={otp}
          onChange={setOtp}
          onSubmit={code => {
            if (code.length !== OTP_LENGTH) return;
            verifyOtpMutation.mutate({ phone: getFullPhoneNumber(), otp: code });
          }}
          isSubmitting={verifyOtpMutation.isPending}
          sentTo={`${selectedCountry?.callingCode ?? ''} ${phoneValue}`}
          resendRemaining={resendTimer.remaining}
          onResend={() => sendOtpMutation.mutate({ phone: getFullPhoneNumber() })}
          isResending={sendOtpMutation.isPending}
        />
      </View>
    );
  };

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

          {flow === 'phone' && renderPhoneInput()}
          {flow === 'otp' && renderOtpInput()}
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
  appleButton: {
    width: '100%',
    height: 50,
    marginTop: 10,
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

});
