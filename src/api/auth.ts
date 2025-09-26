import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

export const request = async (data: any) => {
  try {
    console.log('data', data);
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
      const response = await request(data);
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

export const googleLogin = async (idToken: string) => {
  try {
    const response = await api('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: idToken,
      }),
    });

    const resp = await response;
    return resp;
  } catch (error) {
    if (error instanceof Error) {
      console.log('login Error', error.message);
    } else {
      console.log('login Error', error);
    }
  }
};

export const useGoogleLogin = () => {
  const navigation = useNavigation();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await googleLogin(data);
      return response;
    },
    onSuccess: async data => {
      console.log('data', data);
      if (data.token) {
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

    const data = await response;
    return data;
  } catch (error) {
    if (error instanceof Error) {
      console.log('user Error', error.message);
    } else {
      console.log('user Error', error);
    }
  }
};

export const useUserData = (token: any) => {
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
