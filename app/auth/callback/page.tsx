'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    
    // Check if we have an error in the URL (e.g. from Supabase)
    const params = new URLSearchParams(window.location.search);
    const errorDescription = params.get('error_description');
    if (errorDescription) {
      setError(errorDescription);
      setTimeout(() => router.push('/login'), 3000);
      return;
    }

    // The AuthProvider already listens to onAuthStateChange and will set the user.
    // We just need to wait for it and redirect to dashboard once user is present.
    // If there's a session but the user is not allowed, AuthProvider will show a toast and sign out,
    // which will result in user === null, and the AuthProvider's own protection will redirect to /login.
    
    // We also can check if a session was successfully established in case we missed the event
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setError(error.message);
        setTimeout(() => router.push('/login'), 3000);
      } else if (!session) {
        // No session could be established (e.g. no code in URL or code expired)
        router.push('/login');
      }
    });

  }, [router]);

  // If AuthProvider sets the user, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

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
