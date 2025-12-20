import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

export const requestOtp = async (data: any) => {
  try {
    const response = await api('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        name: data.fullname,
        password: data.password,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    if (error instanceof Error) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: `${error.message || 'Please check your details and try again.'}`,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: `${error || 'Please verify your email and password, then try again'
          }`,
      });
    }
  }
};

const handleAuthRedirect = (navigation: any, redirect: { screen: string; params?: any }) => {
  if (redirect.screen === 'Video') {
    navigation.reset({
      index: 2,
      routes: [
        { name: 'MainTabs' },
        { name: 'SeriesDetail', params: { id: redirect.params?.id } },
        { name: 'Video', params: redirect.params },
      ],
    });
  } else {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'MainTabs' },
        { name: redirect.screen, params: redirect.params },
      ],
    });
  }
};

export const useRequest = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async data => {
      const response = await requestOtp(data);
      return response;
    },
    onSuccess: async data => {
      if (data.token) {
        await useAuthStore.getState().saveToken(data.token);
        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).navigate('MainTabs');
        }
      }
    },
    onError: error => {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: `${error.message || 'Please check your details and try again.'}`,
      });
    },
  });
};

export const login = async (data: any) => {
  try {
    const response = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    if (error instanceof Error) {
    } else {
      console.log('login Error', error);
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: `${error || 'Please verify your email and password, then try again'
          }`,
      });
    }
  }
};

export const useLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async data => {
      const response = await login(data);
      return response;
    },
    onSuccess: async data => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).navigate('MainTabs');
        }
      }
    },
    onError: () => {
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: 'Please verify your email and password, then try again.',
      });
    },
  });
};

export const googleAuthApi = async (idToken: string) => {
  const response = await api('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken }),
  });
  return response;
};

export const useGoogleLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data: any) => {
      return await googleAuthApi(data);
    },
    onSuccess: async data => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).navigate('MainTabs');
        }
      }
    },
    onError: error => {
      console.log('Login Failed', error.message);
    },
  });
};

export const fetchUserData = async () => {
  try {
    const response = await api('/api/user/userInfo', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response) return null;
    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log('user Error', error.message);
    } else {
      console.log('user Error', error);
    }
    return null;
  }
};

export const useUserData = (token: string | null) => {
  return useQuery({
    queryKey: ['userData'],
    queryFn: fetchUserData,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: !!token,
  });
};

export const deleteAccount = async () => {
  try {
    const response = await api('/api/auth/delete/soft', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response;
    return data;
  } catch (error) {
    console.error('Delete account error:', error);
    throw error;
  }
};

export const useDeleteUserAccount = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      await useAuthStore.getState().logout();
      navigation.navigate('MainTabs' as never);
    },
    onError: error => {
      console.log('Account delete failed:', error.message);
    },
  });
};

export const appleAuthApi = async (idToken: string) => {
  try {
    const response = await api('/api/auth/apple-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identityToken: idToken }),
    });

    return response;
  } catch (error: any) {
    Toast.show({
      type: 'error',
      text1: 'Apple login failed',
      text2: `${error.message || 'Please verify your account, then try again.'
        }`,
    });
    throw error;
  }
};

export const useAppleLogin = (redirect?: { screen: string; params?: any }) => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (token: string) => {
      return await appleAuthApi(token);
    },
    onSuccess: async data => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        if (redirect) {
          handleAuthRedirect(navigation, redirect);
        } else {
          (navigation as any).navigate('MainTabs');
        }
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Apple login failed',
        text2: `${error.message || 'Please verify your account, then try again.'
          }`,
      });
    },
  });
};
