import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState } from '../types/auth';
import { logoutApple, logoutGoogle } from '../utils/authService';

export const useAuthStore = create<AuthState>(set => {
  const loadAuthState = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem('isAuthenticated');
      const token = await AsyncStorage.getItem('accessToken');
      const user = await AsyncStorage.getItem('user');

      set({ isAuthenticated: storedAuth === 'true' });
      set({ hasSkipped: await AsyncStorage.getItem('hasSkipped') === 'true' });
      set({ token: token });
      set({ user: user ? JSON.parse(user) : null });
    } catch (error) {
      console.error('Error loading authentication state:', error);
    }
  };

  loadAuthState();
  return {
    isAuthenticated: false,
    hasSkipped: false,
    token: null,
    user: null,
    logout: async () => {
      await logoutGoogle();
      await logoutApple();
      await AsyncStorage.removeItem('isAuthenticated');
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('hasSkipped');
      set({ isAuthenticated: false, token: null, user: null, hasSkipped: false });
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
    },
    setHasSkipped: async (val: boolean) => {
      await AsyncStorage.setItem('hasSkipped', val ? 'true' : 'false');
      set({ hasSkipped: val });
    },
  };
});

export const useAuth = useAuthStore;
