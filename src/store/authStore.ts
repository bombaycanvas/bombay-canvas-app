import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState } from '../types/auth';
import { logoutApple, logoutGoogle } from '../utils/authService';
import queryClient from '../config/queryClient';
import { useVideoStore } from './videoStore';
import { identifyUser, log, resetAnalytics } from '../utils/analytics';

/**
 * Bind the PostHog person to our own user id.
 *
 * `User.id` and nothing else: it is the only identifier the app, the web client
 * and the backend all agree on, so it is what keeps one human as ONE person
 * across platforms. Identifying by email or a device id would split them and
 * quietly invalidate every funnel and retention number.
 *
 * Email and name go on the PERSON profile (deletable on request, and the one
 * place they are genuinely useful) — never onto individual events.
 */
const identifyPostHogUser = (user: { [key: string]: any } | null): void => {
  if (!user?.id) return;

  identifyUser(String(user.id), {
    email: user.email ?? null,
    name: user.name ?? null,
    role: user.role ?? null,
  });
};

export const useAuthStore = create<AuthState>(set => {
  const loadAuthState = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem('isAuthenticated');
      const token = await AsyncStorage.getItem('accessToken');
      const user = await AsyncStorage.getItem('user');

      set({ isAuthenticated: storedAuth === 'true' });
      set({ hasSkipped: (await AsyncStorage.getItem('hasSkipped')) === 'true' });
      set({ token: token });

      const storedLanguages = await AsyncStorage.getItem('preferredLanguages');
      set({
        preferredLanguages: storedLanguages ? JSON.parse(storedLanguages) : null,
      });
      const parsedUser = user ? JSON.parse(user) : null;
      set({ user: parsedUser });
      // Self-healing identity: PostHog persists distinct_id across restarts by
      // itself, so this is usually a no-op (identifyUser skips when the id is
      // unchanged). It matters in the one case where the two stores disagree —
      // PostHog's storage cleared while the session survived — which would
      // otherwise leave a logged-in user reporting as anonymous forever.
      identifyPostHogUser(parsedUser);
      set({ isLoading: false });
    } catch (error) {
      console.error('Error loading authentication state:', error);
      set({ isLoading: false });
    }
  };

  loadAuthState();
  return {
    isAuthenticated: false,
    hasSkipped: false,
    isLoading: true,
    token: null,
    user: null,
    // null = never asked. [] = asked, wants everything. Kept device-local so
    // guests who skipped auth are personalized too.
    preferredLanguages: null,
    logout: async () => {
      logoutGoogle().catch(err => console.log('Google signOut error during logout:', err));
      logoutApple().catch(err => console.log('Apple signOut error during logout:', err));

      try {
        await AsyncStorage.multiRemove([
          'isAuthenticated',
          'accessToken',
          'user',
          'hasSkipped',
          'preferredLanguages',
        ]);
      } catch (error) {
        console.error('Error clearing AsyncStorage during logout:', error);
      }

      // Before the store is cleared: unbinds this device from the user so the
      // NEXT person to sign in here does not inherit their distinct_id and get
      // their events attributed to someone else.
      log.info('Signed out');
      resetAnalytics();

      queryClient.clear();
      useVideoStore.getState().resetPlayer();
      useVideoStore.getState().resetPurchaseState();
      set({
        isAuthenticated: false,
        token: null,
        user: null,
        hasSkipped: false,
        preferredLanguages: null,
      });
    },

    saveToken: async (token: string) => {
      try {
        await AsyncStorage.setItem('accessToken', token);
        await AsyncStorage.setItem('isAuthenticated', 'true');
        set({ isAuthenticated: true });
        set({ token: token });
      } catch (error) {
        console.error('Error saving token:', error);
        await AsyncStorage.removeItem('accessToken');
      }
    },

    removeToken: () => {
      set({ isAuthenticated: false });
    },

    initializeAuth: async () => {
      await loadAuthState();
    },
    setUser: async (user: any) => {
      await AsyncStorage.setItem('user', JSON.stringify(user));
      set({ user });
      // Every sign-in path — phone OTP, email, Google, Apple — lands here, so
      // this one call covers all four rather than four call sites drifting apart.
      identifyPostHogUser(user);
    },
    setHasSkipped: async (val: boolean) => {
      await AsyncStorage.setItem('hasSkipped', val ? 'true' : 'false');
      set({ hasSkipped: val });
    },
    setPreferredLanguages: async (codes: string[]) => {
      await AsyncStorage.setItem('preferredLanguages', JSON.stringify(codes));
      set({ preferredLanguages: codes });
    },
  };
});

export const useAuth = useAuthStore;
