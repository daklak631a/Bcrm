'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { getSupabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { toPublicErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/store/useAuthStore'
import { Profile } from '@/types/models'

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading, user, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()
  const verifyInFlightRef = useRef<string | null>(null)

  useEffect(() => {
    const supabase = getSupabase()

    const verifyUser = async (userId: string, userEmail: string | undefined, accessToken?: string) => {
      if (!userEmail) {
        logger.warn('[AuthProvider] Missing user email')
        await supabase.auth.signOut()
        setUser(null)
        return
      }

      const verifyKey = `${userId}:${accessToken || ''}`
      if (verifyInFlightRef.current === verifyKey) return

      try {
        verifyInFlightRef.current = verifyKey
        logger.debug('[AuthProvider] Verifying current session')
        const res = await fetch('/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ userId, userEmail }),
        })

        const data = await res.json()

        if (res.ok && data.profile) {
          logger.debug('[AuthProvider] Session verified')
          setUser(data.profile as Profile)
          return
        }

        const description = toPublicErrorMessage(data?.error, 'Tài khoản chưa được cấp quyền truy cập hệ thống.')
        logger.warn('[AuthProvider] Verification rejected', { status: res.status })
        toast.error('Truy cập bị từ chối', {
          description,
          duration: 6000,
        })
        await supabase.auth.signOut()
        setUser(null)
      } catch (err) {
        logger.error('[AuthProvider] Verification request failed', { error: toPublicErrorMessage(err) })
        toast.error('Lỗi kết nối', {
          description: 'Không thể xác thực. Vui lòng thử lại.',
        })
        await supabase.auth.signOut()
        setUser(null)
      } finally {
        if (verifyInFlightRef.current === verifyKey) {
          verifyInFlightRef.current = null
        }
      }
    }

    const loadSession = async () => {
      setLoading(true)
      logger.debug('[AuthProvider] Loading session')
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        await verifyUser(session.user.id, session.user.email, session.access_token)
      } else {
        setUser(null)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: any) => {
        logger.debug('[AuthProvider] Auth state changed', { event })
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user) {
          const currentUser = useAuthStore.getState().user
          if (!currentUser) {
            await verifyUser(session.user.id, session.user.email, session.access_token)
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  useEffect(() => {
    if (!isLoading) {
      const publicPaths = ['/login', '/auth/callback']
      const isPublic = publicPaths.some(p => pathname.startsWith(p))

      if (!user && !isPublic) {
        router.replace('/login')
      } else if (user && (pathname === '/login' || pathname.startsWith('/auth/callback'))) {
        router.replace('/dashboard')
      }
    }
  }, [user, isLoading, pathname, router])

  return <>{children}</>
}
