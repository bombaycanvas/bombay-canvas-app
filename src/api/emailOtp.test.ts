import { api } from '../utils/api';
import { login, sendSignupOtp, signupWithOtp, verifyLoginOtp } from './auth';
import { sendContactOtp, verifyContactOtp } from './account';
import { updateProfile } from './profile';

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

beforeEach(() => mockApi.mockReset());

describe('email auth endpoints (new builds)', () => {
  it('login goes through /login/v2, not the legacy route', async () => {
    await login({ email: ' a@x.com ', password: 'pw' });
    expect(mockApi).toHaveBeenCalledWith('/api/auth/login/v2', {
      method: 'POST',
      body: { email: 'a@x.com', password: 'pw' },
    });
  });

  it('signup sends the OTP first, then creates via /signup/verified', async () => {
    await sendSignupOtp('a@x.com ');
    expect(mockApi).toHaveBeenLastCalledWith('/api/auth/signup/send-otp', {
      method: 'POST',
      body: { email: 'a@x.com' },
    });

    await signupWithOtp({
      fullname: 'Asha',
      email: 'a@x.com',
      password: 'secret123',
      otp: '1234',
    });
    expect(mockApi).toHaveBeenLastCalledWith('/api/auth/signup/verified', {
      method: 'POST',
      body: {
        email: 'a@x.com',
        name: 'Asha',
        password: 'secret123',
        otp: '1234',
      },
    });
  });

  it('verifies the login OTP', async () => {
    await verifyLoginOtp({ email: 'a@x.com', otp: '0000' });
    expect(mockApi).toHaveBeenCalledWith('/api/auth/login/verify-otp', {
      method: 'POST',
      body: { email: 'a@x.com', otp: '0000' },
    });
  });
});

describe('settings verification endpoints', () => {
  it.each(['email', 'phone'] as const)('%s send + verify', async kind => {
    await sendContactOtp(kind, 'v');
    expect(mockApi).toHaveBeenLastCalledWith(`/api/user/${kind}/send-otp`, {
      method: 'POST',
      body: { [kind]: 'v' },
    });
    await verifyContactOtp(kind, 'v', '1234');
    expect(mockApi).toHaveBeenLastCalledWith(`/api/user/${kind}/verify`, {
      method: 'POST',
      body: { [kind]: 'v', otp: '1234' },
    });
  });
});

describe('updateProfile', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('updates the name only, without touching complete-profile', async () => {
    await updateProfile({ name: ' Asha ' });
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).toHaveBeenCalledWith('/api/user/profile', {
      method: 'POST',
      body: { data: { name: 'Asha', avatarUrl: undefined } },
    });
  });

  it('uploads the avatar with the signed headers, then saves its public URL', async () => {
    mockApi.mockResolvedValueOnce({
      uploadUrl: 'https://gcs/put',
      publicUrl: 'https://cdn/uploads/avatar.jpg',
      requiredHeaders: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'x' },
    });
    const blob = { size: 1 };
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ blob: () => Promise.resolve(blob) })
      .mockResolvedValueOnce({ ok: true });
    globalThis.fetch = fetchMock as any;

    await updateProfile({
      name: 'Asha',
      photo: { path: 'file:///tmp/a.jpg', mime: 'image/jpeg' },
    });

    expect(mockApi).toHaveBeenNthCalledWith(1, '/api/sign-url', {
      method: 'POST',
      body: { fileName: 'avatar.jpg', contentType: 'image/jpeg' },
    });
    expect(fetchMock).toHaveBeenLastCalledWith('https://gcs/put', {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'x' },
      body: blob,
    });
    expect(mockApi).toHaveBeenLastCalledWith('/api/user/profile', {
      method: 'POST',
      body: {
        data: { name: 'Asha', avatarUrl: 'https://cdn/uploads/avatar.jpg' },
      },
    });
  });

  it('sends avatarUrl: null to reset to the default photo', async () => {
    await updateProfile({ name: 'Asha', photo: 'remove' });
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(mockApi).toHaveBeenCalledWith('/api/user/profile', {
      method: 'POST',
      body: { data: { name: 'Asha', avatarUrl: null } },
    });
  });

  it('does not save the profile when the upload fails', async () => {
    mockApi.mockResolvedValueOnce({ uploadUrl: 'u', publicUrl: 'p' });
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ blob: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: false, status: 403 }) as any;

    await expect(
      updateProfile({
        name: 'Asha',
        photo: { path: 'file:///a.jpg', mime: 'image/jpeg' },
      }),
    ).rejects.toThrow('Image upload failed (403)');
    expect(mockApi).toHaveBeenCalledTimes(1);
  });
});
