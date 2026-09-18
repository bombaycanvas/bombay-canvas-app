import { useAuthStore } from '../store/authStore';

/**
 * Where to land after a successful auth. Read at call time (not via a hook) so
 * the five reset sites in api/auth.ts and CompleteProfileScreen stay one-liners.
 */
export const postAuthRoute = (): 'MainTabs' | 'LanguagePreference' =>
  useAuthStore.getState().user?.languageOnboardedAt == null
    ? 'LanguagePreference'
    : 'MainTabs';
