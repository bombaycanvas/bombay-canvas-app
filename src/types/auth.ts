export type AuthState = {
  isAuthenticated: boolean;
  hasSkipped: boolean;
  isLoading: boolean;
  token: string | null;
  user: { role: string; languageOnboardedAt?: string | null; [key: string]: any } | null;
  logout: () => Promise<void>;
  saveToken: (token: string) => Promise<void>;
  initializeAuth: () => Promise<void>;
  removeToken: () => void;
  setUser: (user: any) => void;
  setHasSkipped: (val: boolean) => Promise<void>;
  preferredLanguages: string[] | null;
  setPreferredLanguages: (codes: string[]) => Promise<void>;
};

export interface UserType {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'inactive';
  resetToken: string | null;
  resetTokenExpiry: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountState {
  accountData: UserType | null;
  setAccountData: (data: UserType) => void;
  loadAccountData: () => Promise<void>;
  clearAccountData: () => void;
}
