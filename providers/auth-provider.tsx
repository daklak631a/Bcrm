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

    const handleAuth = async (userId: string, userEmail: string | undefined) => {
      // 1. Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile && !profileError) {
        // Profile exists
        if ((profile as Profile).is_active === false) {
          await supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser(profile as Profile);
        return;
      }

      // 2. No profile → check if email is pre-approved in allowed_emails
      if (userEmail) {
        const { data: allowed } = await supabase
          .from('allowed_emails')
          .select('*')
          .eq('email', userEmail)
          .eq('is_active', true)
          .single();

        if (allowed) {
          // Auto-create profile from allowed_emails entry
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              full_name: allowed.full_name,
              role: allowed.role || 'USER',
              department_id: allowed.department_id || null,
              is_active: true,
            })
            .select()
            .single();

          if (newProfile && !insertError) {
            setUser(newProfile as Profile);
            return;
          }
        }
      }

      // 3. Not approved → reject
      await supabase.auth.signOut();
      setUser(null);
    };

    const loadSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await handleAuth(session.user.id, session.user.email);
      } else {
        setUser(null);
      }
    };

    loadSession();

    // Listen for auth state changes (Google OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleAuth(session.user.id, session.user.email);
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
