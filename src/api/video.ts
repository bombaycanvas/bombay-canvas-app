import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Movie, Category, CoverVideo } from '../types/movie';

export const getMovies = async (): Promise<{ series: Movie[] }> => {
  try {
    const response = await api(`/api/all-series`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response) {
      throw new Error('No Movies data found');
    }

    const data = await response;
    return data ?? [];
  } catch (error) {
    console.error('Movies Error', error);
    throw error;
  }
};

export const useMoviesData = () => {
  return useQuery({
    queryKey: ['moviesData'],
    queryFn: getMovies,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

const getMoviesByCreator = async (id: string) => {
  try {
    const response = await api(`/api/creator/${id}/series`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await response;
    return data ?? [];
  } catch (error) {
    if (error instanceof Error) {
      console.log('Movies Error', error.message);
    } else {
      console.log('Movies Error', error);
    }

    return { series: [] };
  }
};

export const useMoviesDataByCreator = (id: string) => {
  return useQuery({
    queryKey: ['moviesDataByCreator', id],
    queryFn: () => getMoviesByCreator(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });
};

const getMoviesById = async (id: string) => {
  try {
    const response = await api(`/api/series/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log('Movies Error', error.message);
    } else {
      console.log('Movies Error', error);
    }
  }
};

export const useMoviesDataById = (id: string) => {
  return useQuery({
    queryKey: ['moviesDataById', id],
    queryFn: () => getMoviesById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: true,
  });
};

const getCategories = async (): Promise<Category[] | any> => {
  try {
    const response = await api(`/api/genres`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await response;
    return data ?? [];
  } catch (error) {
    if (error instanceof Error) {
      console.log('Movies Error', error.message);
    } else {
      console.log('Movies Error', error);
    }
  }
};

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: true,
  });
};

const getCoverVideo = async (): Promise<CoverVideo | any> => {
  try {
    const response = await api(`/api/cover-video`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log('Movies Error', error.message);
    } else {
      console.log('Movies Error', error);
    }
  }
};

export const useGetCoverVideo = () => {
  return useQuery({
    queryKey: ['getCoverVideo'],
    queryFn: () => getCoverVideo(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: true,
  });
};
