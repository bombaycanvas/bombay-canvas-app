import { useAuthStore } from '../store/authStore';
import { AuthState } from '../types/auth';
import { needsLanguageStep, postAuthRoute } from './postAuthRoute';

jest.mock('../store/authStore', () => ({
  useAuthStore: { getState: jest.fn() },
}));

type LanguageState = Pick<AuthState, 'token' | 'user' | 'preferredLanguages'>;

const guest: LanguageState = {
  token: null,
  user: null,
  preferredLanguages: null,
};

describe('language onboarding routing', () => {
  it.each<[string, LanguageState, boolean]>([
    ['a guest who has never answered', guest, true],
    ['a guest who skipped', { ...guest, preferredLanguages: [] }, false],
    [
      'a guest who selected languages',
      { ...guest, preferredLanguages: ['hindi'] },
      false,
    ],
    [
      'an account that has never answered',
      {
        token: 'jwt',
        user: { role: 'USER', languageOnboardedAt: null },
        preferredLanguages: [],
      },
      true,
    ],
    [
      'an account that skipped on another device',
      {
        token: 'jwt',
        user: { role: 'USER', languageOnboardedAt: '2026-10-16T10:00:00Z' },
        preferredLanguages: [],
      },
      false,
    ],
    [
      'an onboarded account before its local languages hydrate',
      {
        token: 'jwt',
        user: { role: 'USER', languageOnboardedAt: '2026-10-16T10:00:00Z' },
        preferredLanguages: null,
      },
      false,
    ],
  ])('routes correctly for %s', (_label, state, needsOnboarding) => {
    (useAuthStore.getState as jest.Mock).mockReturnValue(state);

    expect(needsLanguageStep(state)).toBe(needsOnboarding);
    expect(postAuthRoute()).toBe(
      needsOnboarding ? 'LanguagePreference' : 'MainTabs',
    );
  });
});
