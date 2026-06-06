"use client"

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { Building2, AlertCircle, Briefcase, TrendingUp, Shield, Users, BarChart3, PieChart, Landmark, Globe } from 'lucide-react'
import { fetchSystemSettings } from '@/lib/supabase/api'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

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
    <div className="min-h-screen w-full flex bg-slate-50 overflow-hidden">
      
      {/* Left side: Animated Orbital Background */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#003835] via-[#004d4a] to-[#001f1e] items-center justify-center overflow-hidden">
        {/* Abstract background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#009e99] rounded-full mix-blend-screen filter blur-[100px] animate-pulse" style={{ animationDuration: '8s' }}></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ccedea] rounded-full mix-blend-screen filter blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        </div>

        {/* Orbital System */}
        <div className="relative w-[600px] h-[600px] flex items-center justify-center">
          
          {/* Orbit 1 (Outer) */}
          <div className="absolute inset-0 border border-teal-500/20 rounded-full animate-[spin_40s_linear_infinite]" />
          <div className="absolute inset-0 animate-[spin_40s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#002b29] border border-teal-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Briefcase className="w-5 h-5 text-teal-300 transform -rotate-0 animate-[spin_40s_linear_infinite_reverse]" />
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 bg-[#002b29] border border-teal-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Landmark className="w-5 h-5 text-teal-300 transform -rotate-0 animate-[spin_40s_linear_infinite_reverse]" />
            </div>
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#002b29] border border-teal-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Globe className="w-5 h-5 text-teal-300 transform -rotate-0 animate-[spin_40s_linear_infinite_reverse]" />
            </div>
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-[#002b29] border border-teal-500/30 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Shield className="w-5 h-5 text-teal-300 transform -rotate-0 animate-[spin_40s_linear_infinite_reverse]" />
            </div>
          </div>

          {/* Orbit 2 (Middle) */}
          <div className="absolute inset-[100px] border border-teal-400/30 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
          <div className="absolute inset-[100px] animate-[spin_25s_linear_infinite_reverse]">
            <div className="absolute top-[14%] left-[14%] -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[#003835] border border-teal-400/40 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(45,212,191,0.4)]">
              <TrendingUp className="w-4 h-4 text-teal-200 transform -rotate-0 animate-[spin_25s_linear_infinite]" />
            </div>
            <div className="absolute bottom-[14%] right-[14%] translate-x-1/2 translate-y-1/2 w-10 h-10 bg-[#003835] border border-teal-400/40 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(45,212,191,0.4)]">
              <Users className="w-4 h-4 text-teal-200 transform -rotate-0 animate-[spin_25s_linear_infinite]" />
            </div>
          </div>

          {/* Orbit 3 (Inner) */}
          <div className="absolute inset-[200px] border border-teal-300/40 rounded-full animate-[spin_15s_linear_infinite]" />
          <div className="absolute inset-[200px] animate-[spin_15s_linear_infinite]">
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#004d4a] border border-teal-300/50 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(94,234,212,0.5)]">
              <BarChart3 className="w-3.5 h-3.5 text-teal-100 transform -rotate-0 animate-[spin_15s_linear_infinite_reverse]" />
            </div>
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-[#004d4a] border border-teal-300/50 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(94,234,212,0.5)]">
              <PieChart className="w-3.5 h-3.5 text-teal-100 transform -rotate-0 animate-[spin_15s_linear_infinite_reverse]" />
            </div>
          </div>

          {/* Central Logo */}
          <div className="relative z-10 w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.2)] border-4 border-teal-100/20 backdrop-blur-sm">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain" />
            ) : (
              <Building2 className="w-16 h-16 text-[#006b68]" />
            )}
          </div>
          
          {/* Central Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white rounded-full mix-blend-overlay filter blur-[20px] animate-pulse"></div>

        </div>
        
        {/* Overlay Text */}
        <div className="absolute bottom-12 left-12 right-12 text-center z-20">
          <h2 className="text-3xl font-bold text-white mb-2">{appName}</h2>
          <p className="text-teal-100/80 text-lg">Hệ sinh thái quản lý toàn diện dành cho Banker</p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-24">
        
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex lg:hidden flex-col items-center justify-center text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#004d4a] to-[#002b29] rounded-2xl flex items-center justify-center shadow-lg mb-4">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
            ) : (
              <Building2 className="w-8 h-8 text-white" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {appName}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Hệ thống quản lý quan hệ khách hàng
          </p>
        </div>

        {/* Login Box */}
        <div className="w-full max-w-md">
          <div className="text-left mb-8 hidden lg:block">
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Đăng nhập</h1>
            <p className="text-slate-500">Chào mừng bạn quay trở lại hệ thống.</p>
          </div>

          <div className="bg-white py-10 px-6 sm:px-10 shadow-2xl shadow-slate-200/50 rounded-3xl border border-slate-100 relative overflow-hidden">
            
            {/* Decorative corner */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-50 rounded-full blur-3xl opacity-60"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-60"></div>

            <div className="relative z-10">
              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full group flex items-center justify-center gap-3 py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#006b68] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="bg-white p-1 rounded-full shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <span>Đăng nhập bằng Google</span>
              </button>

              {error && (
                <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-rose-700 font-medium">{error}</p>
                </div>
              )}

              <div className="mt-8 relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-white text-xs text-slate-400 font-medium tracking-wide uppercase">
                    Bảo mật nội bộ
                  </span>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-slate-500">
                Chỉ tài khoản được Admin cấp quyền mới có thể truy cập hệ thống. Mọi truy cập trái phép đều được ghi nhận.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
