'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuth = async () => {
      const token = searchParams.get('token');
      console.log('[Callback] Token received:', token ? 'yes' : 'no');
      
      if (!token) {
        console.log('[Callback] No token, redirecting to home');
        setStatus('error');
        setErrorMessage('No authentication token received');
        setTimeout(() => router.push('/'), 2000);
        return;
      }

      try {
        console.log('[Callback] Attempting login...');
        console.log('[Callback] Token length:', token.length);
        const success = await login(token);
        
        if (success) {
          console.log('[Callback] Login successful!');
          setStatus('success');
          // Use replace to prevent back button issues
          setTimeout(() => {
            router.replace('/dashboard');
          }, 500);
        } else {
          console.log('[Callback] Login failed');
          setStatus('error');
          setErrorMessage('Authentication failed. Check browser console for details.');
          setTimeout(() => router.push('/'), 5000);
        }
      } catch (error: any) {
        console.error('[Callback] Login error:', error);
        setStatus('error');
        setErrorMessage(`Error: ${error?.message || 'Unknown error'}`);
        setTimeout(() => router.push('/'), 5000);
      }
    };

    handleAuth();
  }, [searchParams, login, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center p-8 rounded-xl border bg-card max-w-md">
        {status === 'loading' && (
          <>
            <div className="mb-4 h-12 w-12 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <h2 className="text-xl font-semibold mb-2">Authenticating...</h2>
            <p className="text-muted-foreground">Please wait while we log you in</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="mb-4 h-12 w-12 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Login Successful!</h2>
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="mb-4 h-12 w-12 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to home...</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
