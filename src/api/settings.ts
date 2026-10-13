import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export const fetchPublicSettings = async (): Promise<Record<string, any>> => {
  try {
    const res = await api('/api/settings', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res || {};
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return {};
  }
};

export const usePublicSettings = () =>
  useQuery({
    queryKey: ['publicSettings'],
    queryFn: fetchPublicSettings,
    staleTime: 0,
    refetchOnMount: 'always',
  });

export const useSetting = (key: string, fallback: any = undefined) => {
  const { data } = usePublicSettings();
  return data && key in data ? data[key] : fallback;
};

export const useFlag = (key: string, fallback: boolean = false) => {
  const { data } = usePublicSettings();
  return data && key in data ? Boolean(data[key]) : fallback;
};

// Fallbacks for the first render before /api/settings resolves; the live
// values are the backend `media.*` settings.
export const FALLBACK_AVATAR_URL =
  'https://cdncanvas.stream/uploads/1758545484110-aaa.png';
export const FALLBACK_COVER_URL =
  'https://cdncanvas.stream/uploads/1757661776404-Card%20Image.png';

export const useDefaultAvatar = (): string =>
  useSetting('media.defaultAvatarUrl', FALLBACK_AVATAR_URL);

export const useDefaultCover = (): string =>
  useSetting('media.defaultCoverUrl', FALLBACK_COVER_URL);
