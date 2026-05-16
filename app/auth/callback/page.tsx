'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Profile } from '@/types/models';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const supabase = getSupabase();

    const processCallback = async () => {
      try {
        // Check for error in URL (hash or query)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);

        const errorMsg = hashParams.get('error_description') || urlParams.get('error_description');
        if (errorMsg) {
          console.error('[Callback] Auth error from provider:', errorMsg);
          setError(errorMsg);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        // Implicit flow: tokens arrive in hash fragment
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken) {
          console.log('[Callback] Found tokens in hash, setting session...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError || !data.session) {
            console.error('[Callback] setSession failed:', sessionError?.message);
            setError(`Lỗi xác thực: ${sessionError?.message || 'Không tạo được phiên'}`);
            setTimeout(() => router.push('/login'), 3000);
            return;
          }

          console.log('[Callback] Session established, verifying user...');
          window.history.replaceState(null, '', window.location.pathname);

          // Directly verify and redirect — don't wait for AuthProvider
          await verifyAndRedirect(data.session.user.id, data.session.user.email || '');
          return;
        }

        // Fallback: maybe session already exists
        console.log('[Callback] No tokens in URL, checking existing session...');
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('[Callback] Existing session found, verifying...');
          await verifyAndRedirect(session.user.id, session.user.email || '');
          return;
        }

        // Nothing found
        console.warn('[Callback] No auth data found');
        setError('Không tìm thấy thông tin đăng nhập. Vui lòng thử lại.');
        setTimeout(() => router.push('/login'), 3000);

      } catch (err: any) {
        console.error('[Callback] Unexpected error:', err);
        setError(err.message || 'Đã xảy ra lỗi không mong muốn.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    const verifyAndRedirect = async (userId: string, userEmail: string) => {
      try {
        console.log(`[Callback] Calling /api/auth/verify for ${userEmail}...`);
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userEmail }),
        });

        const data = await res.json();
        console.log('[Callback] Verify response:', res.status, data);

        if (res.ok && data.profile) {
          console.log('[Callback] Verified! Role:', data.profile.role);
          setUser(data.profile as Profile);
          router.push('/dashboard');
          return;
        }

        // Rejected
        console.warn('[Callback] Rejected:', data.error);
        const supabase = getSupabase();
        await supabase.auth.signOut();
        setError(data.error || 'Tài khoản chưa được cấp quyền.');
        setTimeout(() => router.push('/login'), 4000);
      } catch (err: any) {
        console.error('[Callback] Verify network error:', err);
        setError('Lỗi kết nối server. Vui lòng thử lại.');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    processCallback();
  }, [router, setUser]);

  // Timeout safety net
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!error) {
        setError('Xác thực mất quá lâu. Vui lòng thử lại.');
        setTimeout(() => router.push('/login'), 3000);
      }
    }, 20000);
    return () => clearTimeout(timeout);
  }, [error, router]);

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
