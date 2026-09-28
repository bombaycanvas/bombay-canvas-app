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
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useUserData } from '../api/auth';
import { PhotoChange, useUpdateProfile } from '../api/profile';
import { useAuthStore } from '../store/authStore';
import ProfileField from '../components/profile/ProfileField';
import PhotoSheet from '../components/profile/PhotoSheet';

const DEFAULT_AVATAR =
  'https://storage.googleapis.com/bombay_canvas_buckett/uploads/1758545484110-aaa.png';

const formatPhone = (phone: string) =>
  parsePhoneNumberFromString(phone)?.formatInternational() ?? phone;

const EditProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const { data } = useUserData(useAuthStore.getState().token);
  const user = data?.userData;
  const savedAvatar: string | undefined = user?.profiles?.[0]?.avatarUrl;

  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<PhotoChange>(undefined);
  const [isPhotoSheetOpen, setIsPhotoSheetOpen] = useState(false);

  // Seed the name once the account loads; later refetches keep user edits.
  const userId = user?.id;
  useEffect(() => {
    if (userId) setName(user.name ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const updateProfile = useUpdateProfile(() => setPhoto(undefined));

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
            {!!user?.email && (
              <ProfileField icon="mail-outline" value={user.email} readOnly />
            )}
            {!!user?.phone && (
              <ProfileField
                icon="call-outline"
                value={formatPhone(user.phone)}
                readOnly
              />
            )}
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
