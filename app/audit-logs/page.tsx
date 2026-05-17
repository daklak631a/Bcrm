"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Loader2, Activity } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState } from "react"
import { fetchAuditLogs } from "@/lib/supabase/api"
import { useRouter } from "next/navigation"

export default function AuditLogsPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    // Only allow Admin
    if (user && user.role !== 'ADMIN_LEVEL_1') {
      router.push('/dashboard')
      return
    }

    const loadData = async () => {
      try {
        const data = await fetchAuditLogs(200)
        setLogs(data)
      } catch (err) {
        console.error('Failed to fetch audit logs', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, router])

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.profiles?.full_name || '').toLowerCase().includes(q)
    )
  })

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-emerald-600 bg-emerald-50 border-emerald-200'
      case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'DELETE': return 'text-rose-600 bg-rose-50 border-rose-200'
      default: return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const translateEntityType = (type: string) => {
    switch (type) {
      case 'CUSTOMER': return 'Khách Hàng'
      case 'LOAN': return 'Khoản Vay'
      case 'DEPOSIT': return 'Huy Động'
      case 'INTERACTION': return 'Tương Tác'
      default: return type
    }
  }

  return (
    <DashboardLayout title="Lịch Sử Thao Tác Hệ Thống">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo hành động, người dùng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none"
            />
          </div>
        </div>

        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-sm text-slate-600 font-medium">
                    <th className="py-3 px-4 font-semibold">Thời gian</th>
                    <th className="py-3 px-4 font-semibold">Người thực hiện</th>
                    <th className="py-3 px-4 font-semibold">Hành động</th>
                    <th className="py-3 px-4 font-semibold">Đối tượng</th>
                    <th className="py-3 px-4 font-semibold">Chi tiết đối tượng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {new Date(log.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-slate-800">{log.profiles?.full_name || 'Hệ thống'}</p>
                        <p className="text-xs text-slate-500">{log.profiles?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-700">
                        {translateEntityType(log.entity_type)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 font-mono text-xs">
                        {log.entity_id.split('-')[0]}...
                      </td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        <Activity className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                        Không tìm thấy nhật ký thao tác
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
