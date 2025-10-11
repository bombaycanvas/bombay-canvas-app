import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

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
      console.log('Sign up Error', error.message);
    } else {
      console.log('login Error', error);
    }
  }
};

export const useRequest = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async data => {
      const response = await requestOtp(data);
      return response;
    },
    onSuccess: async data => {
      if (data.token) {
        await useAuthStore
          .getState()
          .saveToken(data.token)
          .then(() => {
            navigation.navigate('MainTabs' as never);
          });
      }
    },
    onError: error => {
      console.log('Signup Failed', error.message);
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
    }
  }
};

export const useLogin = () => {
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
        navigation.navigate('MainTabs' as never);
      }
    },
    onError: error => {
      console.log('Login Failed', error.message);
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

export const useGoogleLogin = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data: any) => {
      return await googleAuthApi(data);
    },
    onSuccess: async data => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        navigation.navigate('MainTabs' as never);
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
    console.error('❌ Apple login failed:', error.message || error);
    throw error;
  }
};

export const useAppleLogin = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (token: string) => {
      return await appleAuthApi(token);
    },
    onSuccess: async data => {
      if (data?.token) {
        await useAuthStore.getState().saveToken(data.token);
        await useAuthStore.getState().setUser(data.user);
        navigation.navigate('MainTabs' as never);
      }
    },
    onError: (error: any) => {
      console.log('Apple Login Failed:', error.message);
    },
  });
};
