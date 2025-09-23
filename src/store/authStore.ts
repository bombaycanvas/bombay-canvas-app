import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthState } from '../types/auth';

export const useAuthStore = create<AuthState>(set => {
  const loadAuthState = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem('isAuthenticated');
      const token = await AsyncStorage.getItem('accessToken');
      const user = await AsyncStorage.getItem('user');

      set({ isAuthenticated: storedAuth === 'true' });
      set({ token: token });
      set({ user: user ? JSON.parse(user) : null });
    } catch (error) {
      console.error('Error loading authentication state:', error);
    }
  };

  loadAuthState();
  return {
    isAuthenticated: false,
    token: null,
    user: null,
    logout: async () => {
      await AsyncStorage.removeItem('isAuthenticated');
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('user');
      set({ isAuthenticated: false, token: null, user: null });
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
  };
});

export const useAuth = useAuthStore;
