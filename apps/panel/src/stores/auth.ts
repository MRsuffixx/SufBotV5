import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator: string | null;
  avatar: string | null;
  role: 'USER' | 'MODERATOR' | 'ADMIN' | 'OWNER';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (accessToken) => set({ accessToken }),

      login: async (token: string) => {
        set({ accessToken: token, isLoading: true });
        try {
          console.log('[Auth] Logging in with token:', token.substring(0, 20) + '...');
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
          });
          console.log('[Auth] Login response status:', response.status);
          if (response.ok) {
            const user = await response.json();
            console.log('[Auth] User data:', user);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            console.log('[Auth] Login failed, response not ok');
            set({ accessToken: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('[Auth] Login error:', error);
          set({ accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          await fetch(`${API_URL}/api/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          });
        } catch {
          // Ignore errors
        }
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { accessToken } = get();
        console.log('[Auth] Checking auth, token exists:', !!accessToken);
        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: 'include',
          });
          console.log('[Auth] Check auth response:', response.status);
          if (response.ok) {
            const user = await response.json();
            console.log('[Auth] User authenticated:', user.username);
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            console.log('[Auth] Check auth failed, clearing state');
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('[Auth] Check auth error:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ accessToken: state.accessToken }),
    }
  )
);
