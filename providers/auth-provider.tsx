'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Profile } from '@/types/models';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabase();

    const verifyUser = async (userId: string, userEmail: string | undefined, accessToken?: string) => {
      if (!userEmail) {
        console.error('[AuthProvider] No email found for user');
        await supabase.auth.signOut();
        setUser(null);
        return;
      }

      try {
        console.log(`[AuthProvider] Verifying user: ${userEmail}`);
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ userId, userEmail }),
        });

        const data = await res.json();

        if (res.ok && data.profile) {
          console.log('[AuthProvider] Verified successfully:', data.profile.role);
          setUser(data.profile as Profile);
          return;
        }

        // Rejected
        console.warn('[AuthProvider] Verification failed:', data.error);
        toast.error('Truy cập bị từ chối', {
          description: data.error || `Tài khoản ${userEmail} chưa được cấp quyền.`,
          duration: 6000,
        });
        await supabase.auth.signOut();
        setUser(null);
      } catch (err) {
        console.error('[AuthProvider] Network error during verify:', err);
        toast.error('Lỗi kết nối', {
          description: 'Không thể xác thực. Vui lòng thử lại.',
        });
        await supabase.auth.signOut();
        setUser(null);
      }
    };

    const loadSession = async () => {
      setLoading(true);
      console.log('[AuthProvider] Loading session...');
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        console.log('[AuthProvider] Session found for:', session.user.email);
        await verifyUser(session.user.id, session.user.email, session.access_token);
      } else {
        console.log('[AuthProvider] No session found');
        setUser(null);
      }
    };

    loadSession();

    // Listen for auth state changes (Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Auth state changed:', event);
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
          // Only verify if we don't already have a user set (callback page may have already done this)
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            await verifyUser(session.user.id, session.user.email, session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      const publicPaths = ['/login', '/auth/callback'];
      const isPublic = publicPaths.some(p => pathname.startsWith(p));

      if (!user && !isPublic) {
        router.replace('/login');
      } else if (user && (pathname === '/login' || pathname.startsWith('/auth/callback'))) {
        router.replace('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  return <>{children}</>;
}
