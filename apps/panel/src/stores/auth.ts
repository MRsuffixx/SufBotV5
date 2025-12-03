import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  isHydrated: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      login: async (token: string) => {
        console.log('[Auth] Starting login...');
        set({ accessToken: token, isLoading: true });
        
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('[Auth] Login response status:', response.status);
          
          if (response.ok) {
            const user = await response.json();
            console.log('[Auth] User data received:', user?.username);
            set({ 
              user, 
              accessToken: token,
              isAuthenticated: true, 
              isLoading: false 
            });
            return true;
          } else {
            const errorText = await response.text();
            console.log('[Auth] Login failed:', response.status, errorText);
            set({ 
              user: null,
              accessToken: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            return false;
          }
        } catch (error) {
          console.error('[Auth] Login error:', error);
          set({ 
            user: null,
            accessToken: null, 
            isAuthenticated: false, 
            isLoading: false 
          });
          return false;
        }
      },

      logout: async () => {
        const { accessToken } = get();
        console.log('[Auth] Logging out...');
        
        // Clear state first to ensure immediate UI update
        set({ 
          user: null, 
          accessToken: null, 
          isAuthenticated: false,
          isLoading: false 
        });
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
        }
        
        // Then try to call the API
        if (accessToken) {
          try {
            await fetch(`${API_URL}/api/auth/logout`, {
              method: 'POST',
              headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            });
          } catch (error) {
            console.log('[Auth] Logout API call failed (ignored):', error);
          }
        }
      },

      checkAuth: async () => {
        const { accessToken, user } = get();
        console.log('[Auth] Checking auth, token exists:', !!accessToken, 'user exists:', !!user);
        
        if (!accessToken) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // If we already have user data, just validate the token
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            method: 'GET',
            headers: { 
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          console.log('[Auth] Check auth response:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('[Auth] User authenticated:', userData?.username);
            set({ 
              user: userData, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else {
            console.log('[Auth] Token invalid, clearing state');
            set({ 
              user: null, 
              accessToken: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
            // Clear localStorage
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth-storage');
            }
          }
        } catch (error) {
          console.error('[Auth] Check auth error:', error);
          // On network error, keep existing state but stop loading
          // This prevents logout on temporary network issues
          if (user) {
            set({ isLoading: false, isAuthenticated: true });
          } else {
            set({ isLoading: false, isAuthenticated: false });
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('[Auth] Rehydrated from storage:', !!state?.accessToken);
        if (state) {
          state.setHydrated(true);
        }
      },
    }
  )
);
