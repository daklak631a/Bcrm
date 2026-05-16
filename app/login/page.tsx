'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore, Role } from '@/store/useAuthStore'
import { getSupabase } from '@/lib/supabase/client'
import { Building2, UserCircle, ShieldCheck, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuthStore()
  const [role, setRole] = useState<Role>('user')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDemoLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    login(role)
    router.push('/dashboard')
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center transform rotate-3 shadow-lg">
            <Building2 className="w-7 h-7 text-white font-bold transform -rotate-3" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Nexus Banking CRM
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Hệ thống quản lý quan hệ khách hàng
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Đăng nhập bằng Google
          </button>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          <p className="mt-3 text-center text-xs text-slate-400">
            Chỉ tài khoản được Admin cấp quyền mới đăng nhập được.
          </p>

          {/* Divider */}
          <div className="relative mt-6 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-slate-400 uppercase tracking-wider">Hoặc dùng Demo</span>
            </div>
          </div>

          {/* Demo Login */}
          <form className="space-y-5" onSubmit={handleDemoLogin}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Chọn vai trò Demo
              </label>
              <div className="space-y-2.5">
                <label
                  className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all ${
                    role === 'admin_1'
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="role" value="admin_1" checked={role === 'admin_1'} onChange={() => setRole('admin_1')} className="sr-only" />
                  <ShieldCheck className={`w-5 h-5 mr-3 ${role === 'admin_1' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Giám Đốc (Admin Cấp 1)</div>
                    <div className="text-xs text-slate-500">Toàn quyền hệ thống, quản lý nhân sự</div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all ${
                    role === 'admin_2'
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="role" value="admin_2" checked={role === 'admin_2'} onChange={() => setRole('admin_2')} className="sr-only" />
                  <UserCircle className={`w-5 h-5 mr-3 ${role === 'admin_2' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Trưởng Chi Nhánh (Admin Cấp 2)</div>
                    <div className="text-xs text-slate-500">Quản lý chuyên viên trong chi nhánh</div>
                  </div>
                </label>

                <label
                  className={`flex items-center p-3.5 border rounded-xl cursor-pointer transition-all ${
                    role === 'user'
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                  }`}
                >
                  <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="sr-only" />
                  <UserCircle className={`w-5 h-5 mr-3 ${role === 'user' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Chuyên Viên (User)</div>
                    <div className="text-xs text-slate-500">Xem dữ liệu được phân công</div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Đang xác thực...' : 'Vào chế độ Demo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
