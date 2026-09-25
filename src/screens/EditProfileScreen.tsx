import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useUserData } from '../api/auth';
import { PhotoChange, useUpdateProfile } from '../api/profile';
import { ContactKind, ContactTarget, useSendContactOtp } from '../api/account';
import { useAuthStore } from '../store/authStore';
import { useResendTimer } from '../hooks/useResendTimer';
import ProfileField, {
  VerifiedBadge,
  VerifyPill,
} from '../components/profile/ProfileField';
import PhotoSheet from '../components/profile/PhotoSheet';
import ContactVerifySheet from '../components/profile/ContactVerifySheet';
import PhoneField from '../components/profile/PhoneField';
import {
  isValidPhone,
  PhoneDraft,
  phoneDigits,
  splitPhone,
  toE164,
} from '../utils/phone';

const DEFAULT_AVATAR =
  'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png';
const RESEND_COOLDOWN_SECONDS = 30;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EditProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { data } = useUserData(useAuthStore.getState().token);
  const user = data?.userData;
  const savedAvatar: string | undefined = user?.profiles?.[0]?.avatarUrl;

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState<PhoneDraft>(splitPhone());
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<ContactTarget | null>(null);
  const [sendId, setSendId] = useState(0);
  const resendTimer = useResendTimer(RESEND_COOLDOWN_SECONDS, !!verifyTarget);

  // Seed the form once the account loads; later refetches keep user edits.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setPhone(splitPhone(user.phone));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateProfile = useUpdateProfile(() => setPhoto(undefined));
  const sendOtp = useSendContactOtp(target => {
    setSendId(id => id + 1);
    setVerifyTarget(target);
    resendTimer.restart();
  });

  const contactValue = (kind: ContactKind) =>
    kind === 'email' ? email.trim().toLowerCase() : toE164(phone) ?? '';
  const hasDraft = (kind: ContactKind) =>
    kind === 'email' ? !!email.trim() : !!phoneDigits(phone);

  const isVerified = (kind: ContactKind) => {
    const saved = user?.[kind];
    const verified =
      kind === 'email' ? user?.emailVerified : user?.phoneVerified;
    return !!saved && !!verified && contactValue(kind) === saved;
  };

  const startVerification = (kind: ContactKind) => {
    const valid =
      kind === 'email'
        ? EMAIL_RE.test(contactValue('email'))
        : isValidPhone(phone);
    if (!valid) {
      Toast.show({
        type: 'error',
        text1:
          kind === 'email'
            ? 'Enter a valid email address'
            : 'Enter a valid phone number',
      });
      return;
    }
    sendOtp.mutate({ kind, value: contactValue(kind) });
  };

  const verificationAccessory = (kind: ContactKind) =>
    isVerified(kind) ? (
      <VerifiedBadge />
    ) : (
      <VerifyPill
        onPress={() => startVerification(kind)}
        disabled={!hasDraft(kind)}
        loading={sendOtp.isPending && sendOtp.variables?.kind === kind}
      />
    );

  const verificationHint = (kind: ContactKind) => {
    if (isVerified(kind) || !hasDraft(kind)) return undefined;
    return kind === 'email'
      ? "Not verified yet. We'll send a 4-digit code to this address."
      : "Not verified yet. We'll send a 4-digit code by SMS.";
  };

  const trimmedName = name.trim();
  const canSave =
    !!trimmedName && (trimmedName !== user?.name || photo !== undefined);
  const avatarUri =
    photo === 'remove'
      ? DEFAULT_AVATAR
      : photo?.path || savedAvatar || DEFAULT_AVATAR;
  const hasCustomPhoto =
    photo === undefined
      ? !!savedAvatar && savedAvatar !== DEFAULT_AVATAR
      : photo !== 'remove';

  return (
    <LinearGradient colors={['#1a1a1a', '#000']} style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarSection}
            onPress={() => setIsPhotoSheetOpen(true)}
          >
            <View>
              <FastImage
                source={{ uri: avatarUri }}
                style={styles.avatar}
                resizeMode={FastImage.resizeMode.cover}
              />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </View>
            <Text style={styles.changePhoto}>Change photo</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Your Information</Text>
          <View style={styles.fields}>
            <ProfileField
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              autoCapitalize="words"
              maxLength={60}
            />
            <ProfileField
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="Add email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              accessory={verificationAccessory('email')}
              hint={verificationHint('email')}
            />
            <PhoneField
              country={phone.country}
              onChangeCountry={country =>
                setPhone(prev => ({ ...prev, country }))
              }
              number={phone.number}
              onChangeNumber={number => setPhone(prev => ({ ...prev, number }))}
              readOnly={isVerified('phone')}
              accessory={verificationAccessory('phone')}
              hint={verificationHint('phone')}
            />
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.saveButton, !canSave && styles.saveDisabled]}
            onPress={() => updateProfile.mutate({ name: trimmedName, photo })}
            disabled={!canSave || updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PhotoSheet
        visible={isPhotoSheetOpen}
        onClose={() => setIsPhotoSheetOpen(false)}
        onPicked={setPhoto}
        onRemove={hasCustomPhoto ? () => setPhoto('remove') : undefined}
      />
      <ContactVerifySheet
        target={verifyTarget}
        sendId={sendId}
        onClose={() => setVerifyTarget(null)}
        resendRemaining={resendTimer.remaining}
        onResend={() => verifyTarget && sendOtp.mutate(verifyTarget)}
        isResending={sendOtp.isPending}
      />
    </LinearGradient>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingTop: 28,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff6a00',
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhoto: {
    color: '#ff6a00',
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 10,
    fontFamily: 'HelveticaNowDisplay-Regular',
  },
  fields: {
    gap: 10,
    marginBottom: 32,
  },
  saveButton: {
    marginTop: 'auto',
    height: 60,
    borderRadius: 15,
    backgroundColor: '#ff6a00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff6a00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  saveDisabled: {
    opacity: 0.5,
    backgroundColor: 'rgba(255,106,0,0.5)',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'HelveticaNowDisplay-Bold',
  },
});
