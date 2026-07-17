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
