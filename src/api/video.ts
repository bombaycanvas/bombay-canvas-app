import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api';
import { Movie, Category, CoverVideo } from '../types/movie';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NEXT_PUBLIC_BASE_URL } from '@env';
import RazorpayCheckout from 'react-native-razorpay';
import Toast from 'react-native-toast-message';

export const getMovies = async (): Promise<{ series: Movie[] }> => {
  try {
    const response = await api(`/api/all-series`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response) {
      throw new Error('No series found');
    }

    const data = await response;
    return data ?? [];
  } catch (error) {
    console.error('Series Error', error);
    throw error;
  }
};

export const useMoviesData = () => {
  return useQuery({
    queryKey: ['moviesData'],
    queryFn: getMovies,
  });
};

export const getRecommendedSeries = async (): Promise<{ series: Movie[] }> => {
  try {
    const response = await api(`/api/recommended-series`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response) {
      throw new Error('No recommended series found');
    }

    const data = await response;
    return data ?? [];
  } catch (error) {
    console.error('Series Error', error);
    throw error;
  }
};

export const useRecommendedSeriesData = () => {
  return useQuery({
    queryKey: ['listRecommendedSeries'],
    queryFn: getRecommendedSeries,
  });
};

const getMoviesByCreator = async (id: string) => {
  try {
    const response = await api(`/api/creator/${id}/series`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  });
};

const getMoviesById = async (id: string) => {
  try {
    const response = await api(`/api/series-new/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  });
};

export const getPlayVideoWithID = async (id: string) => {
  try {
    if (!id) return null;

    let token = useAuthStore.getState().token;

    if (!token) {
      token = await AsyncStorage.getItem('accessToken');
    }

    const headers: any = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await api(`/api/stream-episode/${id}`, {
      method: 'GET',
      headers,
    });
    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log('Play Episode Error', error.message);
    } else {
      console.log('Failed to fetch episode', error);
    }
  }
};

export const usePlayVideoWithId = (id?: string) => {
  return useQuery({
    queryKey: ['playEpisode', id],
    queryFn: () => getPlayVideoWithID(id!),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 30,
  });
};

const getCategories = async (): Promise<Category[] | any> => {
  try {
    const response = await api(`/api/genres`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  });
};

const getCoverVideo = async (): Promise<CoverVideo | any> => {
  try {
    const response = await api(`/api/cover-video`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
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
  });
};

export const createRazorpayOrder = async ({
  seriesId,
  couponId,
}: {
  seriesId: string;
  couponId?: string | null;
}) => {
  const token =
    useAuthStore.getState().token ||
    (await AsyncStorage.getItem('accessToken'));

  const res = await api(`/api/monetize/create-order`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seriesId, couponId }),
  });

  return res;
};

export const verifyRazorpayOrder = async (payload: any) => {
  const token =
    useAuthStore.getState().token ||
    (await AsyncStorage.getItem('accessToken'));
  const apiUrl = NEXT_PUBLIC_BASE_URL;

  const verifyRes = await fetch(`${apiUrl}/api/monetize/verify-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify(payload),
  });

  if (!verifyRes.ok) throw new Error('Payment verification failed');
  return verifyRes.json();
};

export const openRazorpayCheckout = async (orderData: any) => {
  const user = useAuthStore.getState().user;

  const formatIndianMobile = (mobile?: string) => {
    if (!mobile) return undefined;
    const digitsOnly = mobile.replace(/\D/g, '');
    return digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
  };

  const mobile = formatIndianMobile(
    user?.mobile || user?.phone || user?.contact,
  );

  const data = orderData?.order ?? orderData;

  const orderId = data?.orderId || data?.id;
  const amount = data?.finalAmount ?? data?.amount;
  const currency = data?.currency || 'INR';
  const key = data?.key || data?.razorpayKey || 'rzp_test_123';
  const purchaseId = data?.purchaseId;

  if (!amount || !orderId) {
    Toast.show({
      type: 'error',
      text1: 'Payment Error',
      text2: 'Invalid order data received from server.',
    });
    throw new Error('Invalid order data received from server.');
  }

  const amountInPaise = Math.round(amount * 100);

  return new Promise((resolve, reject) => {
    const options = {
      key,
      amount: amountInPaise.toString(),
      currency,
      name: 'Bombay Canvas',
      description: 'Purchase access',
      order_id: orderId,

      method: {
        upi: true,
        card: true,
        netbanking: true,
        wallet: true,
        emi: true,
      },

      upi: {
        flow: 'intent',
      },

      prefill: {
        contact: mobile,
        email: user?.email,
        name: user?.name,
      },

      theme: { color: '#ff6600' },
    };

    RazorpayCheckout.open(options)
      .then(async (paymentData: any) => {
        const verifyRes = await verifyRazorpayOrder({
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_signature: paymentData.razorpay_signature,
          purchaseId,
        });
        resolve(verifyRes);
      })
      .catch((error: any) => {
        console.error('❌ Razorpay Error', error);
        reject(error);
      });
  });
};

export const useRazorpayPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      couponId,
    }: {
      seriesId: string;
      couponId?: string | null;
    }) => {
      const orderData = await createRazorpayOrder({ seriesId, couponId });

      const verification = await openRazorpayCheckout(orderData);
      return verification;
    },

    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Payment Successful!',
        text2: 'Your purchase has been verified 🎉',
      });
      queryClient.invalidateQueries({ queryKey: ['moviesDataById'] });
      queryClient.invalidateQueries({ queryKey: ['playEpisode'] });
    },

    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: error?.message || 'Please try again.',
      });
    },
  });
};

export const applyCouponAPI = async ({
  seriesId,
  couponCode,
}: {
  seriesId: string;
  couponCode: string;
}) => {
  try {
    const res = await api(`/api/monetize/coupon/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seriesId, couponCode }),
    });

    return res;
  } catch (error) {
    console.error('❌ Coupon Apply API Error:', error);
    throw error;
  }
};

export const useApplyCoupon = () => {
  return useMutation({
    mutationFn: (payload: any) => applyCouponAPI(payload),

    onSuccess: () => {
      Toast.show({
        type: 'success',
        text1: 'Coupon applied!',
        text2: 'Discount added successfully 🎉',
      });
    },

    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Invalid coupon',
        text2: error?.message || 'Please try another coupon.',
      });
    },
  });
};
