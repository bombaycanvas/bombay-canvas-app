// Any endpoint can tell this build it is too old for the request. The API
// client raises the app-wide update prompt for it, so no screen has to know the
// code — and the caller still gets the error.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../store/authStore', () => ({
  useAuthStore: { getState: () => ({ logout: jest.fn() }) },
}));
jest.mock('../services/storeCountry', () => ({ peekStoreCountry: () => null }));
jest.mock('./analytics/appData', () => ({ getAppDataHeader: () => null }));
jest.mock('./analytics/log', () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { api } from './api';
import { useUpdatePromptStore } from '../store/updatePromptStore';

const respondWith = (status: number, body: unknown) => {
  (globalThis as any).fetch = jest.fn(() =>
    Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) }),
  );
};

beforeEach(() => {
  useUpdatePromptStore.getState().hide();
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('api — APP_UPDATE_REQUIRED', () => {
  it('raises the update prompt and still rejects', async () => {
    respondWith(409, {
      error: { code: 'APP_UPDATE_REQUIRED', message: 'Please update the app to subscribe' },
    });

    await expect(api('/api/monetize/subscription/create')).rejects.toMatchObject({
      code: 'APP_UPDATE_REQUIRED',
      status: 409,
    });
    expect(useUpdatePromptStore.getState().visible).toBe(true);
  });

  it('leaves the prompt alone for any other error', async () => {
    respondWith(409, {
      error: { code: 'SUBSCRIPTION_ALREADY_ACTIVE', message: 'Already subscribed' },
    });

    await expect(api('/api/monetize/subscription/create')).rejects.toBeTruthy();
    expect(useUpdatePromptStore.getState().visible).toBe(false);
  });
});
