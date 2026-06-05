'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase/client'
import { logger } from '@/lib/logger'
import { toPublicErrorMessage } from '@/lib/errors'
import { useAuthStore } from '@/store/useAuthStore'
import { Profile } from '@/types/models'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { setUser } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const supabase = getSupabase()

    const verifyAndRedirect = async (userId: string, userEmail: string, accessToken?: string) => {
      try {
        logger.debug('[Callback] Calling auth verify endpoint')
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
          logger.debug('[Callback] User verified')
          setUser(data.profile as Profile)
          router.push('/dashboard')
          return
        }

        await supabase.auth.signOut()
        setError(toPublicErrorMessage(data?.error, 'Tài khoản chưa được cấp quyền.'))
        setTimeout(() => router.push('/login'), 4000)
      } catch (err) {
        logger.error('[Callback] Verify request failed', { error: toPublicErrorMessage(err) })
        setError('Lỗi kết nối server. Vui lòng thử lại.')
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    const processCallback = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const urlParams = new URLSearchParams(window.location.search)

        const errorMsg = hashParams.get('error_description') || urlParams.get('error_description')
        if (errorMsg) {
          logger.warn('[Callback] Provider rejected auth callback')
          setError(toPublicErrorMessage(errorMsg, 'Không thể đăng nhập. Vui lòng thử lại.'))
          setTimeout(() => router.push('/login'), 3000)
          return
        }

        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          })

          if (sessionError || !data.session) {
            logger.warn('[Callback] Could not establish Supabase session')
            setError(toPublicErrorMessage(sessionError, 'Không tạo được phiên đăng nhập.'))
            setTimeout(() => router.push('/login'), 3000)
            return
          }

          window.history.replaceState(null, '', window.location.pathname)
          await verifyAndRedirect(data.session.user.id, data.session.user.email || '', data.session.access_token)
          return
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await verifyAndRedirect(session.user.id, session.user.email || '', session.access_token)
          return
        }

        setError('Không tìm thấy thông tin đăng nhập. Vui lòng thử lại.')
        setTimeout(() => router.push('/login'), 3000)
      } catch (err) {
        logger.error('[Callback] Unexpected callback error', { error: toPublicErrorMessage(err) })
        setError(toPublicErrorMessage(err, 'Đã xảy ra lỗi không mong muốn.'))
        setTimeout(() => router.push('/login'), 3000)
      }
    }

    processCallback()
  }, [router, setUser])

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!error) {
        setError('Xác thực mất quá lâu. Vui lòng thử lại.')
        setTimeout(() => router.push('/login'), 3000)
      }
    }, 20000)
    return () => clearTimeout(timeout)
  }, [error, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      {error ? (
        <div className="text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Lỗi đăng nhập</h2>
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
  )
}
