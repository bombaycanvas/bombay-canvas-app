import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

export const getMovies = async () => {
  try {
    const response = await api(`/api/Movie/movies/all`, {
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

export const useMoviesData = () => {
  return useQuery({
    queryKey: ['moviesData'],
    queryFn: () => getMovies(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
  });
};

const getMoviesByCreator = async id => {
  try {
    const response = await api(`/api/Movie/creator/${id}/${'all'}`, {
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

export const useMoviesDataByCreator = id => {
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

const getMoviesById = async id => {
  try {
    const response = await api(`/api/Movie/movie-id/${id}`, {
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

export const useMoviesDataById = id => {
  return useQuery({
    queryKey: ['moviesDataById', id],
    queryFn: () => getMoviesById(id),
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: false,
  });
};

const getCategories = async () => {
  try {
    const response = await api(`/api/Movie/categories`, {
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

const getCoverVideo = async () => {
  try {
    const response = await api(`/api/Movie/cover-video`, {
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
