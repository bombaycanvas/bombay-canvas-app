import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';

export interface Language {
  id: string;
  code: string;
  label: string;
  nativeLabel: string | null;
}

export const fetchLanguages = async (): Promise<Language[]> => {
  try {
    const res = await api('/api/languages', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res?.languages ?? [];
  } catch (error) {
    console.error('Failed to fetch languages:', error);
    return [];
  }
};

export const useLanguages = () =>
  useQuery({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    staleTime: 1000 * 60 * 60,
  });

export const updateLanguagePreferences = async (codes: string[]) => {
  const res = await api('/api/user/language-preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ languages: codes }),
  });
  return res;
};

export const syncLocalLanguagePreferences = async () => {
  const { token, preferredLanguages } = useAuthStore.getState();

  if (!token) return;

  if (preferredLanguages !== null) {
    await updateLanguagePreferences(preferredLanguages);
  }

  const response = await api('/api/user/userInfo-v2', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  const user = response?.userData;

  if (user) {
    await useAuthStore.getState().setUser(user);

    if (Array.isArray(user.preferredLanguages)) {
      await useAuthStore.getState().setPreferredLanguages(
        user.preferredLanguages.map((language: { code: string }) => language.code),
      );
    }
  }
};

export const useUpdateLanguagePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLanguagePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });
};
