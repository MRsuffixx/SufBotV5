'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only check auth after hydration is complete
    if (isHydrated) {
      console.log('[Providers] Hydrated, checking auth...');
      checkAuth();
    }
  }, [isHydrated, checkAuth]);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
