import { NEXT_PUBLIC_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
// import { Platform } from 'react-native';

export const getToken = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

const removeToken = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing token:', error);
  }
};

export const api = async (endpoint: string, config: any = {}) => {
  const { body, headers = {}, ...customConfig } = config;

  const accessToken = await getToken('accessToken');

  const isFormData =
    body && typeof body === 'object' && typeof body.append === 'function';

  const requestConfig: RequestInit = {
    method: config.method ?? 'GET',

    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en;q=0.9',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
      ...headers,
    },
    credentials: 'include',
    body: isFormData
      ? body
      : typeof body === 'string'
        ? body
        : JSON.stringify(body),
    ...customConfig,
  };

  if (requestConfig.headers) {
    const headersObj = requestConfig.headers as Record<string, string>;
    Object.keys(headersObj).forEach(key => {
      if (headersObj[key] === undefined) {
        delete headersObj[key];
      }
    });
  }

  try {
    const apiUrl = NEXT_PUBLIC_BASE_URL;
    // let apiUrl = NEXT_PUBLIC_BASE_URL;
    // if (Platform.OS === 'ios' && apiUrl.includes('10.0.2.2')) {
    //   apiUrl = apiUrl.replace('10.0.2.2', 'localhost');
    // }

    console.log(`[API] ${requestConfig.method} ${apiUrl}${endpoint}`);

    const response = await fetch(
      `${apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`,
      requestConfig,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ message: e }));

      let message = 'Something went wrong';
      if (errorData) {
        if (typeof errorData.error === 'string') {
          message = errorData.error;
        } else if (errorData.error && typeof errorData.error.message === 'string') {
          message = errorData.error.message;
        } else if (typeof errorData.message === 'string') {
          message = errorData.message;
        } else if (errorData.error) {
          message = JSON.stringify(errorData.error);
        }
      }

      if ([401, 414].includes(response.status)) {
        const token = await getToken('accessToken');
        if (token) {
          await removeToken('accessToken');
          await removeToken('isAuthenticated');
          useAuthStore.getState().logout();
        }
      }

      throw new Error(message);
    }

    return response.headers.get('Content-Type')?.includes('application/json')
      ? response.json()
      : response;
  } catch (error: any) {
    throw error;
  }
};
