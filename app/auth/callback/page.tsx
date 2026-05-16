'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const supabase = getSupabase();

    const processCallback = async () => {
      try {
        // Check for error from Supabase/Google in the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);

        const errorMsg = hashParams.get('error_description') || urlParams.get('error_description');
        if (errorMsg) {
          console.error('[Callback] Auth error from provider:', errorMsg);
          setError(errorMsg);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // PKCE flow: exchange code for session
        const code = urlParams.get('code');
        if (code) {
          console.log('[Callback] Found auth code, exchanging for session...');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[Callback] Code exchange failed:', exchangeError);
            setError(`Lỗi xác thực: ${exchangeError.message}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }
          console.log('[Callback] Code exchange successful');
          // Session is now established. AuthProvider's onAuthStateChange will handle the rest.
          return;
        }

        // Implicit flow: tokens in hash fragment
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          console.log('[Callback] Found access token in hash, setting session...');
          const refreshToken = hashParams.get('refresh_token') || '';
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('[Callback] Set session failed:', sessionError);
            setError(`Lỗi xác thực: ${sessionError.message}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }
          console.log('[Callback] Session set successfully');
          return;
        }

        // No code and no tokens - check if session already exists
        console.log('[Callback] No code/token in URL, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Callback] Existing session found for:', session.user.email);
          // AuthProvider will handle verification
          return;
        }

        // Nothing worked
        console.warn('[Callback] No auth data found, redirecting to login');
        setError('Không tìm thấy thông tin đăng nhập. Vui lòng thử lại.');
        setTimeout(() => router.push('/login'), 3000);

      } catch (err: any) {
        console.error('[Callback] Unexpected error:', err);
        setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    processCallback();
  }, [router]);

  // When AuthProvider sets user, redirect to dashboard
  useEffect(() => {
    if (user) {
      console.log('[Callback] User verified, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, router]);

  // Timeout - if stuck for more than 15 seconds, show error
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!user && !error) {
        setError('Xác thực mất quá lâu. Vui lòng thử lại.');
        setTimeout(() => router.push('/login'), 3000);
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [user, error, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      {error ? (
        <div className="text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lỗi Đăng Nhập</h2>
          <p className="text-slate-600 max-w-md">{error}</p>
          <p className="text-slate-400 text-sm mt-4">Đang quay lại trang đăng nhập...</p>
        </div>
      ) : (
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Đang xác thực đăng nhập...</p>
        </div>
      )}
    </div>
  );
}
