import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { api } from '../utils/api';
import { useLogin, useSendSignupOtp } from './auth';

jest.mock('../utils/api', () => ({ api: jest.fn() }));
jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: { show: jest.fn() },
}));
jest.mock('../store/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));
jest.mock('./language', () => ({ syncLocalLanguagePreferences: jest.fn() }));
jest.mock('../utils/analytics', () => ({
  authFailureReason: jest.fn(),
  capture: jest.fn(),
  identifyUser: jest.fn(),
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  ProductEvent: {},
}));
jest.mock('@react-navigation/native', () => ({ useNavigation: jest.fn() }));

const mockApi = api as jest.Mock;

/** Renders `useHook` and returns its latest value. */
const renderHook = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  let latest: T;
  const Probe = () => {
    latest = useHook();
    return null;
  };
  act(() => {
    renderer.create(
      <QueryClientProvider client={client}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  return () => latest!;
};

beforeEach(() => mockApi.mockReset());

describe('email OTP hooks hand back what was submitted', () => {
  it('useSendSignupOtp passes the submitted details, not later edits', async () => {
    let release!: (v: unknown) => void;
    mockApi.mockReturnValue(new Promise(r => (release = r)));
    const onSent = jest.fn();
    const hook = renderHook(() => useSendSignupOtp(onSent));

    const submitted = {
      email: 'first@x.com',
      password: 'secret123',
      fullname: 'Asha',
    };
    await act(async () => {
      hook().mutate(submitted);
    });
    // The user edits the form while the request is in flight; nothing here
    // reads the form, so only the submitted object can reach onSent.
    await act(async () => release({ success: true }));

    expect(mockApi).toHaveBeenCalledWith('/api/auth/signup/send-otp', {
      method: 'POST',
      body: { email: 'first@x.com' },
    });
    expect(onSent).toHaveBeenCalledWith(submitted);
  });

  it('useLogin passes the submitted credentials when an OTP is required', async () => {
    mockApi.mockResolvedValue({ requiresEmailOtp: true });
    const onOtpRequired = jest.fn();
    const hook = renderHook(() => useLogin(undefined, onOtpRequired));

    await act(async () => {
      hook().mutate({ email: ' a@x.com ', password: 'pw-at-submit' });
    });

    expect(onOtpRequired).toHaveBeenCalledWith({
      email: 'a@x.com',
      password: 'pw-at-submit',
    });
  });
});
