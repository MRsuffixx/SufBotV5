'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const token = searchParams.get('token');
    console.log('[Callback] Token received:', token ? 'yes' : 'no');
    
    if (token) {
      login(token).then(() => {
        console.log('[Callback] Login complete, redirecting to dashboard');
        // Small delay to ensure state is persisted
        setTimeout(() => {
          router.push('/dashboard');
        }, 100);
      }).catch((error) => {
        console.error('[Callback] Login error:', error);
        router.push('/');
      });
    } else {
      console.log('[Callback] No token, redirecting to home');
      router.push('/');
    }
  }, [searchParams, login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Authenticating...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
