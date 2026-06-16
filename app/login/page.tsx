"use client"

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { Building2, AlertCircle, Shield, Briefcase, Globe, TrendingUp, PieChart, Loader2 } from 'lucide-react'
import { fetchSystemSettings } from '@/lib/supabase/api'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Chào buổi sáng!'
  if (hour < 18) return 'Chào buổi chiều!'
  return 'Chào buổi tối!'
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [appName, setAppName] = useState("Nexus Banking CRM")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSystemSettings()
        const logo = settings.find((s: any) => s.key === 'logo_url')?.value
        const name = settings.find((s: any) => s.key === 'app_name')?.value
        if (logo) setLogoUrl(logo)
        if (name) setAppName(name)
      } catch (err) {
        logger.warn("[Login] Failed to load public settings", { error: getErrorMessage(err) })
      }
    }
    loadSettings()
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        setError('Không thể kết nối Google. Vui lòng thử lại.')
        setIsLoading(false)
      }
    } catch {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center relative overflow-hidden bg-[#001210]">
      {/* ------------------------------------------------------------- */}
      {/* BACKGROUND: Deep modern glows & mesh gradients */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#005c58] rounded-full mix-blend-screen blur-[120px] opacity-60 animate-pulse"
          style={{ animationDuration: '10s' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#008a85] rounded-full mix-blend-screen blur-[150px] opacity-40 animate-pulse"
          style={{ animationDuration: '15s' }}
        />
        <div
          className="absolute top-[40%] left-[60%] w-[30%] h-[30%] bg-emerald-600/30 rounded-full mix-blend-screen blur-[100px] animate-pulse"
          style={{ animationDuration: '8s' }}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BACKGROUND: Orbital animation (ultra-thin & futuristic) */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="relative w-[800px] h-[800px] lg:w-[1200px] lg:h-[1200px] flex items-center justify-center scale-75 lg:scale-100">
          {/* Inner ring */}
          <div className="absolute w-[400px] h-[400px] rounded-full border border-white/5 border-dashed animate-[spin_40s_linear_infinite]" />
          <div className="absolute w-[400px] h-[400px] animate-[spin_40s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#001a18] rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.2)]">
              <PieChart size={16} className="text-teal-400" />
            </div>
          </div>

          {/* Middle ring */}
          <div className="absolute w-[700px] h-[700px] rounded-full border border-white/5 animate-[spin_60s_linear_infinite_reverse]" />
          <div className="absolute w-[700px] h-[700px] animate-[spin_60s_linear_infinite_reverse]">
            <div className="absolute top-1/4 left-[5%] -translate-x-1/2 w-12 h-12 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.15)]">
              <Briefcase size={18} className="text-teal-300" />
            </div>
            <div className="absolute bottom-1/4 right-[5%] translate-x-1/2 w-12 h-12 bg-white/5 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(45,212,191,0.15)]">
              <TrendingUp size={18} className="text-teal-300" />
            </div>
          </div>

          {/* Outer ring */}
          <div className="absolute w-[1000px] h-[1000px] rounded-full border border-white/5 border-dashed animate-[spin_90s_linear_infinite]" />
          <div className="absolute w-[1000px] h-[1000px] animate-[spin_90s_linear_infinite]">
            <div className="absolute top-1/2 -left-7 -translate-y-1/2 w-14 h-14 bg-gradient-to-br from-teal-500/20 to-emerald-500/5 backdrop-blur-md rounded-full border border-teal-300/20 flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.2)]">
              <Globe size={22} className="text-teal-200" />
            </div>
            <div className="absolute bottom-[10%] left-[20%] w-14 h-14 bg-gradient-to-br from-teal-500/20 to-emerald-500/5 backdrop-blur-md rounded-full border border-teal-300/20 flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.2)]">
              <Shield size={22} className="text-teal-200" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DESKTOP TITLE (top-left floating context) */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-10 left-10 hidden lg:block z-0 pointer-events-none">
        <h2 className="text-[20px] font-black text-white/90 drop-shadow-md tracking-[0.2em] uppercase">
          {appName}
        </h2>
        <p className="text-teal-200/50 text-sm font-medium tracking-widest uppercase mt-1">
          Hệ sinh thái quản lý dành cho Banker
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* LOGIN BOX (premium glassmorphism, centered) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full px-5 lg:px-0 lg:max-w-[440px] z-20 relative">
        {/* Subtle decorative glow behind the card */}
        <div className="absolute inset-0 bg-teal-400/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="bg-white/5 backdrop-blur-[40px] rounded-[32px] border border-white/10 p-8 sm:p-10 shadow-[0_20px_80px_-20px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-500 hover:border-white/20">
          {/* Card inner glows */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-teal-400/10 rounded-full blur-[50px] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-10 relative z-10">
            <div className="w-20 h-20 bg-gradient-to-br from-teal-300/30 to-emerald-600/10 rounded-[22px] flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(45,212,191,0.15)] p-[1px] border border-white/10 group">
              <div className="w-full h-full bg-[#001210]/60 backdrop-blur-xl rounded-[20px] flex items-center justify-center transition-transform group-hover:scale-95 duration-300">
                {logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-12 h-12 object-contain filter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                  />
                ) : (
                  <Building2
                    size={34}
                    className="text-teal-300 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                  />
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2 drop-shadow-md">
              Đăng nhập
            </h1>
            <p className="text-teal-100/60 text-sm">{getGreeting()} Chào mừng bạn quay lại {appName}.</p>
          </div>

          {/* Google sign-in */}
          <div className="relative z-10">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group w-full flex justify-center items-center gap-3 bg-white text-slate-800 font-bold rounded-[18px] py-4 px-4 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] hover:shadow-[0_10px_50px_-10px_rgba(45,212,191,0.4)] hover:bg-slate-50 min-h-[60px]"
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-teal-600" size={22} />
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              <span>{isLoading ? 'Đang kết nối…' : 'Đăng nhập bằng Google'}</span>
            </button>

            {error && (
              <div className="mt-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-400/20 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-300 mt-0.5 shrink-0" />
                <p className="text-sm text-rose-100 font-medium leading-relaxed">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile app title (bottom of the screen) */}
        <div className="mt-8 text-center lg:hidden relative z-20">
          <p className="text-[11px] font-bold text-teal-200/30 tracking-widest uppercase">
            {appName} &copy; 2026
          </p>
        </div>
      </div>
    </div>
  )
}
