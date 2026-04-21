import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_staff?: boolean;
  tokens_balance?: number;
  nano_coins?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  tokenExpiresAt: number | null;    // Unix ms
  isAuthenticated: boolean;
  setAuth: (user: User, token: string, expiresInSeconds?: number) => void;
  updateBalance: (tokens: number, nanoCoins: number) => void;
  logout: () => void;
  isTokenExpired: () => boolean;
}

/** JWT access token umri: 30 daqiqa (settings bilan bir xil) */
const ACCESS_TOKEN_LIFETIME_MS = 30 * 60 * 1000;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      tokenExpiresAt: null,
      isAuthenticated: false,

      setAuth: (user, token, expiresInSeconds) => {
        const expiresAt = Date.now() + (expiresInSeconds
          ? expiresInSeconds * 1000
          : ACCESS_TOKEN_LIFETIME_MS);
        set({ user, token, tokenExpiresAt: expiresAt, isAuthenticated: true });
      },

      updateBalance: (tokens, nanoCoins) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, tokens_balance: tokens, nano_coins: nanoCoins } });
      },

      logout: () => set({
        user: null,
        token: null,
        tokenExpiresAt: null,
        isAuthenticated: false,
      }),

      isTokenExpired: () => {
        const exp = get().tokenExpiresAt;
        if (!exp) return true;
        return Date.now() > exp;
      },
    }),
    {
      name: 'auth-storage-v2',
      storage: createJSONStorage(() => sessionStorage), // tab yopilganda o'chadi
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tokenExpiresAt: state.tokenExpiresAt,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
