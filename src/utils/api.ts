import { NEXT_PUBLIC_BASE_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { getAppDataHeader } from './analytics/appData';

export const CLIENT_PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

// CFBundleShortVersionString / versionName — "2.3", not the build number. The
// backend picks the payment rail from this, not from the platform alone: a
// global flag plus "ios" would also switch the Razorpay binaries still on
// customers' phones. getVersion() is synchronous and reads a value baked into
// the bundle, so it cannot fail or change at runtime.
export const CLIENT_APP_VERSION = DeviceInfo.getVersion();

/** An HTTP failure from `api()`, carrying the server's stable error `code` and status so callers can branch on the cause instead of the message text. */
export interface ApiError extends Error {
  code?: string;
  status?: number;
}

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

export const getApiUrl = (endpoint: string): string => {
  let apiUrl = NEXT_PUBLIC_BASE_URL || '';
  if (Platform.OS === 'ios' && apiUrl.includes('10.0.2.2')) {
    apiUrl = apiUrl.replace('10.0.2.2', 'localhost');
  }
  const cleanBaseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  return `${cleanBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    }`;
};

export const api = async (endpoint: string, config: any = {}) => {
  const { body, headers = {}, ...customConfig } = config;

  const accessToken = await getToken('accessToken');

  const isFormData =
    body && typeof body === 'object' && typeof body.append === 'function';

  const appDataHeader = getAppDataHeader();

  const requestConfig: RequestInit = {
    method: config.method ?? 'GET',

    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-GB,en;q=0.9',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: accessToken ? `Bearer ${accessToken}` : '',
      'X-Client-Platform': CLIENT_PLATFORM,
      'X-Client-App-Version': CLIENT_APP_VERSION,
      ...(appDataHeader ? { 'X-Client-App-Data': appDataHeader } : {}),
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
    const url = getApiUrl(endpoint);

    console.log(`[API] ${requestConfig.method} ${url}`);

    const response = await fetch(url, requestConfig);

    if (!response.ok) {
      const errorData = await response.json().catch(e => ({ message: e }));

      let message = 'Something went wrong';
      if (errorData) {
        if (typeof errorData.error === 'string') {
          message = errorData.error;
        } else if (
          errorData.error &&
          typeof errorData.error.message === 'string'
        ) {
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

      const apiError: ApiError = new Error(message);
      // The server's stable error code, read from the `{ error: { code } }`
      // envelope first and the legacy top-level `{ code }` second — both shapes
      // are in use across the API. Without it callers can only match on message
      // text, which breaks the moment a message is reworded.
      apiError.code =
        typeof errorData?.error?.code === 'string'
          ? errorData.error.code
          : typeof errorData?.code === 'string'
            ? errorData.code
            : undefined;
      apiError.status = response.status;
      throw apiError;
    }

    return response.headers.get('Content-Type')?.includes('application/json')
      ? response.json()
      : response;
  } catch (error: any) {
    throw error;
  }
};
