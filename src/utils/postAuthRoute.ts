import { useAuthStore } from '../store/authStore';

// A guest's [] is an explicit skip, while null means they have never answered.
// After sign-in, the account's completion stamp is authoritative; guest answers
// are synced to accounts that have never been asked before post-auth routing.
export const needsLanguageStep = ({
  token,
  user,
  preferredLanguages,
}: Pick<
  ReturnType<typeof useAuthStore.getState>,
  'token' | 'user' | 'preferredLanguages'
>) => (token ? user?.languageOnboardedAt == null : preferredLanguages === null);

/**
 * Where to land after a successful auth or a guest skip. Read at call time (not
 * via a hook) so the reset sites in api/auth.ts and the screens stay one-liners.
 */
export const postAuthRoute = (): 'MainTabs' | 'LanguagePreference' =>
  needsLanguageStep(useAuthStore.getState())
    ? 'LanguagePreference'
    : 'MainTabs';
