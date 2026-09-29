import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export interface LocalImage {
  path: string;
  mime: string;
}

interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
  requiredHeaders?: Record<string, string>;
}

/** Uploads a local image to GCS via a signed URL and returns its public URL. */
export const uploadImage = async (image: LocalImage, fileName: string) => {
  const signed: SignedUpload = await api('/api/sign-url', {
    method: 'POST',
    body: { fileName, contentType: image.mime },
  });

  const blob = await (await fetch(image.path)).blob();
  const res = await fetch(signed.uploadUrl, {
    method: 'PUT',
    // Must echo the signed headers or GCS rejects the signature.
    headers: signed.requiredHeaders ?? { 'Content-Type': image.mime },
    body: blob,
  });
  if (!res.ok) throw new Error(`Image upload failed (${res.status})`);

  return signed.publicUrl;
};

/** A newly picked image, 'remove' to reset to the default avatar, or unchanged. */
export type PhotoChange = LocalImage | 'remove' | undefined;

export interface ProfileUpdate {
  name: string;
  photo?: PhotoChange;
}

const resolveAvatarUrl = async (photo: PhotoChange) => {
  if (photo === 'remove') return null; // backend swaps in the default avatar
  if (photo) return uploadImage(photo, 'avatar.jpg');
  return undefined;
};

// Uses /api/user/profile, not /complete-profile, which clears the account email.
export const updateProfile = async ({ name, photo }: ProfileUpdate) => {
  const avatarUrl = await resolveAvatarUrl(photo);
  return api('/api/user/profile', {
    method: 'POST',
    body: { data: { name: name.trim(), avatarUrl } },
  });
};

export const useUpdateProfile = (onDone: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async (_data, { name }) => {
      const { user, setUser } = useAuthStore.getState();
      if (user) await setUser({ ...user, name: name.trim() });
      await queryClient.invalidateQueries({ queryKey: ['userData'] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      onDone();
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Failed to update profile',
        text2: error?.message || 'Please try again.',
      });
    },
  });
};
