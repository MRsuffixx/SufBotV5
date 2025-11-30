import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
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
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ accessToken: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
          set({ accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      logout: async () => {
        const { accessToken } = get();
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
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
        if (!accessToken) {
          set({ isLoading: false });
          return;
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (response.ok) {
            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
          }
        } catch {
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
