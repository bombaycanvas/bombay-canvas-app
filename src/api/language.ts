import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';

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

export const useUpdateLanguagePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLanguagePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userData'] });
    },
  });
};
