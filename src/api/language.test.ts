import { api } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { AuthState } from '../types/auth';
import { postAuthRoute } from '../utils/postAuthRoute';
import { fetchLanguages, syncLocalLanguagePreferences } from './language';

jest.mock('../utils/api', () => ({ api: jest.fn() }));
jest.mock('../store/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));

const mockApi = api as jest.Mock;

beforeEach(() => mockApi.mockReset());

describe('fetchLanguages', () => {
  it('returns the languages from the server', async () => {
    const languages = [
      { id: 'l1', code: 'hindi', label: 'Hindi', nativeLabel: null },
    ];
    mockApi.mockResolvedValue({ languages });

    await expect(fetchLanguages()).resolves.toEqual(languages);
  });

  // An empty list here would be cached as a real answer and could get saved
  // as the user's choice, so failures must reject instead.
  it('rejects when the request fails', async () => {
    mockApi.mockRejectedValue(new Error('Network request failed'));
    await expect(fetchLanguages()).rejects.toThrow('Network request failed');
  });

  it('rejects when the response has no languages array', async () => {
    mockApi.mockResolvedValue({ message: 'oops' });
    await expect(fetchLanguages()).rejects.toThrow(
      'Invalid languages response',
    );
  });
});

describe('language onboarding across sign-in', () => {
  let state: Pick<AuthState, 'token' | 'user' | 'preferredLanguages'>;
  const setUser = jest.fn(async user => {
    state.user = user;
  });
  const setPreferredLanguages = jest.fn(async codes => {
    state.preferredLanguages = codes;
  });
  const completedAt = '2026-10-16T10:00:00Z';

  beforeEach(() => {
    state = { token: 'jwt', user: { role: 'USER' }, preferredLanguages: null };
    setUser.mockClear();
    setPreferredLanguages.mockClear();
    (useAuthStore.getState as jest.Mock).mockImplementation(() => ({
      ...state,
      setUser,
      setPreferredLanguages,
    }));
  });

  it.each([{ codes: [] }, { codes: ['hindi'] }])(
    'carries a guest answer $codes to a new account without asking again',
    async ({ codes }) => {
      state.preferredLanguages = codes;
      mockApi
        .mockResolvedValueOnce({
          userData: { role: 'USER', languageOnboardedAt: null },
        })
        .mockResolvedValueOnce({
          userData: { languageOnboardedAt: completedAt },
        });

      await syncLocalLanguagePreferences();

      expect(mockApi).toHaveBeenNthCalledWith(
        2,
        '/api/user/language-preferences',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ languages: codes }),
        }),
      );
      expect(state.preferredLanguages).toEqual(codes);
      expect(state.user?.languageOnboardedAt).toBe(completedAt);
      expect(postAuthRoute()).toBe('MainTabs');
    },
  );

  it.each([
    { preferredLanguages: [] },
    { preferredLanguages: [{ code: 'tamil' }] },
  ])(
    'keeps an existing account answer $preferredLanguages when the guest skipped',
    async ({ preferredLanguages }) => {
      state.preferredLanguages = [];
      mockApi.mockResolvedValueOnce({
        userData: {
          role: 'USER',
          languageOnboardedAt: completedAt,
          preferredLanguages,
        },
      });

      await syncLocalLanguagePreferences();

      expect(mockApi).toHaveBeenCalledTimes(1);
      expect(state.preferredLanguages).toEqual(
        preferredLanguages.map(language => language.code),
      );
      expect(postAuthRoute()).toBe('MainTabs');
    },
  );

  it('still asks a new account when there was no guest answer', async () => {
    mockApi.mockResolvedValueOnce({
      userData: {
        role: 'USER',
        languageOnboardedAt: null,
        preferredLanguages: [],
      },
    });

    await syncLocalLanguagePreferences();

    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(postAuthRoute()).toBe('LanguagePreference');
  });
});
