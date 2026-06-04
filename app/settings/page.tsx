"use client"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useCallback, useEffect, useState } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { fetchSystemSettings, updateSystemSetting } from "@/lib/supabase/api"
import { toast } from "sonner"
import { Loader2, Save, Image as ImageIcon, Globe, LayoutGrid, CheckCircle } from "lucide-react"

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [appName, setAppName] = useState("Nexus Banking CRM")
  const [logoUrl, setLogoUrl] = useState("")
  const [faviconUrl, setFaviconUrl] = useState("")

  const isAdmin = user?.role === 'ADMIN_LEVEL_0' || user?.role === 'ADMIN_LEVEL_1'

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const settings = await fetchSystemSettings()
      
      const appNameSetting = settings.find((s: any) => s.key === 'app_name')
      const logoUrlSetting = settings.find((s: any) => s.key === 'logo_url')
      const faviconUrlSetting = settings.find((s: any) => s.key === 'favicon_url')

      if (appNameSetting) setAppName(appNameSetting.value)
      if (logoUrlSetting) setLogoUrl(logoUrlSetting.value)
      if (faviconUrlSetting) setFaviconUrl(faviconUrlSetting.value)
    } catch (err: any) {
      toast.error("Lỗi tải cấu hình: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadSettings()
  }, [loadSettings])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      toast.error("Bạn không có quyền thực hiện hành động này")
      return
    }
    
    try {
      setSaving(true)
      await Promise.all([
        updateSystemSetting('app_name', appName.trim()),
        updateSystemSetting('logo_url', logoUrl.trim()),
        updateSystemSetting('favicon_url', faviconUrl.trim()),
      ])
      
      toast.success("Đã lưu cấu hình hệ thống thành công!")
      // Dispatch storage event to trigger update in other tabs or components
      window.dispatchEvent(new Event('storage'))
    } catch (err: any) {
      toast.error("Lỗi lưu cấu hình: " + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  if (!isAdmin) {
    return (
      <DashboardLayout title="Cài đặt hệ thống">
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center max-w-lg mx-auto mt-20">
          <h2 className="text-lg font-bold mb-2">Truy cập bị từ chối</h2>
          <p className="text-sm">Bạn không có quyền quản trị tối cao (Admin Level 1) để cấu hình logo và các thông số hệ thống.</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Cài Đặt Hệ Thống">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        {/* Settings Form */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main inputs */}
          <form onSubmit={handleSave} className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
            <h3 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-emerald-600" /> Cấu hình hệ thống
            </h3>

            {/* App name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Tên ứng dụng</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
                placeholder="Tên ứng dụng"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all font-medium text-slate-800"
              />
            </div>

            {/* Logo url */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Đường dẫn Logo</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-slate-800"
              />
            </div>

            {/* Favicon url */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Đường dẫn Favicon</label>
              <input
                type="text"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://..."
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-slate-800"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || saving}
              className="mt-2 inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Lưu cấu hình</span>
            </button>
          </form>

          {/* Previews panel */}
          <div className="flex flex-col gap-6">
            {/* Logo Preview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col items-center text-center justify-center min-h-[160px]">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5 self-start">
                <ImageIcon className="w-4 h-4 text-emerald-600" /> Xem trước Logo
              </h4>
              {logoUrl ? (
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex items-center justify-center w-full max-h-24 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoUrl} alt="App Logo" className="max-h-16 object-contain" onError={() => toast.error("Đường dẫn logo không thể truy cập")} />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center w-full">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Chưa cấu hình Logo</span>
                </div>
              )}
            </div>

            {/* Favicon Preview */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col items-center text-center justify-center min-h-[160px]">
              <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5 self-start">
                <Globe className="w-4 h-4 text-emerald-600" /> Xem trước Favicon
              </h4>
              {faviconUrl ? (
                <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex items-center justify-center w-16 h-16">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" onError={() => toast.error("Đường dẫn favicon không thể truy cập")} />
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50 flex flex-col items-center justify-center w-full">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Chưa cấu hình Favicon</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
