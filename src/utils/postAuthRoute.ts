import { useAuthStore } from '../store/authStore';

// Asked until at least one language is picked; a skip doesn't count. Signed-in
// users' lists are synced from the server before any post-auth routing.
export const needsLanguageStep = ({
  preferredLanguages,
}: Pick<ReturnType<typeof useAuthStore.getState>, 'preferredLanguages'>) =>
  !preferredLanguages?.length;

/**
 * Where to land after a successful auth or a guest skip. Read at call time (not
 * via a hook) so the reset sites in api/auth.ts and the screens stay one-liners.
 */
export const postAuthRoute = (): 'MainTabs' | 'LanguagePreference' =>
  needsLanguageStep(useAuthStore.getState()) ? 'LanguagePreference' : 'MainTabs';
