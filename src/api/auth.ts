import { useMutation } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useNavigation } from '@react-navigation/native';

export const requestOtp = async data => {
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
      const response = await requestOtp(data);
      return response;
    },
    onSuccess: async data => {
      if (data.token) {
        await useAuthStore
          .getState()
          .saveToken(data.token)
          .then(() => {
            navigation.navigate('Home' as never);
          });
      }
    },
    onError: error => {
      console.log('Signup Failed', error.message);
    },
  });
};

export const login = async data => {
  console.log('data', data);
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
        await useAuthStore
          .getState()
          .saveToken(data.token)
          .then(() => {
            navigation.navigate('Home' as never);
          });
      }
    },
    onError: error => {
      console.log('Login Failed', error.message);
    },
  });
};

export const googleLogin = async idToken => {
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
    mutationFn: async data => {
      const response = await googleLogin(data);
      return response;
    },
    onSuccess: async data => {
      if (data.token) {
        await useAuthStore
          .getState()
          .saveToken(data.token)
          .then(() => {
            navigation.navigate('Home' as never);
          });
      }
    },
    onError: error => {
      console.log('Login Failed', error.message);
    },
  });
};
