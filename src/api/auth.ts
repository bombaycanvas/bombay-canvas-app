import { useMutation } from '@tanstack/react-query';
import { api } from '../utils/api';

export const requestOtp = async (payload: { phone: string; name: string }) => {
  try {
    const response = await api('/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    return await response;
  } catch (error: any) {
    console.log('login Error', error.message);
    throw error;
  }
};

export const useRequestOtp = (
  _onSuccess?: (data: any) => void,
  _onError?: (error: any) => void,
) => {
  return useMutation({
    mutationFn: (payload: { phone: string; name: string }) =>
      requestOtp(payload),
    onSuccess: data => {
      _onSuccess?.(data);
    },
    onError: (err: any) => {
      _onError?.(err);
    },
  });
};

export const verifyOtp = async (data: { phone: string; otp: string }) => {
  const response = await api('/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return response;
};

export const useVerifyOtp = (
  _onSuccess?: (data: any) => void,
  _onError?: (error: any) => void,
) => {
  return useMutation({
    mutationFn: (data: { phone: string; otp: string }) => verifyOtp(data),
    onSuccess: () => {},
    onError: (_err: any) => {},
  });
};
