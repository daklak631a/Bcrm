'use client';

import { useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { Profile } from '@/types/models';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const supabase = getSupabase();

    const loadSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (data && !error) {
          const profile = data as Profile;
          if (profile.is_active === false) {
            // Tài khoản bị vô hiệu hóa
            await supabase.auth.signOut();
            setUser(null);
            return;
          }
          setUser(profile);
        } else {
          // Google login nhưng chưa có profile → chặn
          await supabase.auth.signOut();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    loadSession();

    // Listen for auth state changes (Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (data && !error) {
            const profile = data as Profile;
            if (profile.is_active === false) {
              await supabase.auth.signOut();
              setUser(null);
              return;
            }
            setUser(profile);
          } else {
            // Không có profile → từ chối đăng nhập
            await supabase.auth.signOut();
            setUser(null);
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
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, pathname, router]);

  return <>{children}</>;
}
