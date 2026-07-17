import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import Toast from 'react-native-toast-message';

const showToast = (message: string, type: 'success' | 'error') => {
  Toast.show({
    type,
    text1: type === 'success' ? 'Success' : 'Error',
    text2: message,
  });
};

export const fetchSeriesReviews = async (seriesId: string, page = 1) => {
  const res = await api(
    `/api/engagement/series/${seriesId}/reviews?page=${page}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );
  return res;
};

export const useSeriesReviews = (seriesId: string, page = 1) =>
  useQuery({
    queryKey: ['seriesReviews', seriesId, page],
    queryFn: () => fetchSeriesReviews(seriesId, page),
    enabled: !!seriesId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 1,
  });

export const useUpsertReview = (seriesId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rating, text }: { rating: number; text: string }) =>
      api(`/api/engagement/series/${seriesId}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seriesReviews', seriesId] });
      qc.invalidateQueries({ queryKey: ['moviesDataById', seriesId] });
      showToast('Review saved', 'success');
    },
    onError: (err: any) => {
      showToast(err?.message || 'Could not save review', 'error');
    },
  });
};

export const useDeleteReview = (seriesId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api(`/api/engagement/series/${seriesId}/review`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seriesReviews', seriesId] });
      qc.invalidateQueries({ queryKey: ['moviesDataById', seriesId] });
      showToast('Review removed', 'success');
    },
    onError: (err: any) =>
      showToast(err?.message || 'Could not remove review', 'error'),
  });
};

export const useToggleEpisodeLike = (episodeId: string, seriesId?: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api(`/api/engagement/episode/${episodeId}/like`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playEpisode', episodeId] });
      if (seriesId) {
        qc.invalidateQueries({ queryKey: ['moviesDataById', seriesId] });
      }
    },
    onError: (err: any) => {
      showToast(err?.message || 'Could not toggle like', 'error');
    },
  });
};
