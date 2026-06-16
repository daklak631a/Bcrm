"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import { getSupabase } from "@/lib/supabase/client"
import { useState, useEffect, useCallback } from "react"
import { Profile, RoleDelegation } from "@/types/models"
import { Shield, Plus, Trash2, CalendarDays } from "lucide-react"

export default function DelegationsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [delegations, setDelegations] = useState<RoleDelegation[]>([])
  const [l3Profiles, setL3Profiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  
  const [showModal, setShowModal] = useState(false)
  const [selectedDelegatee, setSelectedDelegatee] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = getSupabase()
    
    // Fetch delegations
    let query = supabase.from('role_delegations').select(`
      *,
      delegatee:profiles!delegatee_id(full_name, email, department_id),
      delegator:profiles!delegator_id(full_name, email, department_id)
    `).order('created_at', { ascending: false })

    // Fetch L3 users
    let l3Query = supabase.from('profiles').select('*').eq('role', 'ADMIN_LEVEL_3')

    if (user?.role === 'ADMIN_LEVEL_2') {
      l3Query = l3Query.eq('department_id', user.department_id || '')
    }

    const [delRes, l3Res] = await Promise.all([query, l3Query])
    if (delRes.data) {
      const visibleDelegations = user?.role === 'ADMIN_LEVEL_2'
        ? delRes.data.filter((delegation: any) => {
            return delegation.delegatee?.department_id === user.department_id || delegation.delegator?.department_id === user.department_id
          })
        : delRes.data
      setDelegations(visibleDelegations as unknown as RoleDelegation[])
    }
    if (l3Res.data) setL3Profiles(l3Res.data as Profile[])
      
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (mounted) fetchData()
  }, [mounted, fetchData])

  if (!mounted) return null

  if (user?.role !== 'ADMIN_LEVEL_1' && user?.role !== 'ADMIN_LEVEL_2') {
    return (
      <DashboardLayout title="Ủy Quyền">
        <div className="flex items-center justify-center h-[50vh] text-slate-500">
          Bạn không có quyền truy cập trang này.
        </div>
      </DashboardLayout>
    )
  }

  const handleSave = async () => {
    if (!selectedDelegatee || !startDate || !endDate) {
      setError('Vui lòng điền đầy đủ thông tin')
      return
    }
    if (endDate < startDate) {
      setError('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu')
      return
    }
    if (user?.role === 'ADMIN_LEVEL_2' && !l3Profiles.some((profile) => profile.id === selectedDelegatee)) {
      setError('Bạn chỉ được ủy quyền cho nhân sự trong phòng ban của mình')
      return
    }
    
    const supabase = getSupabase()
    const { error } = await supabase.from('role_delegations').insert({
      delegator_id: user.id,
      delegatee_id: selectedDelegatee,
      delegated_role: 'ADMIN_LEVEL_2',
      start_date: startDate,
      end_date: endDate,
      status: 'ACTIVE'
    })
    
    if (error) {
      setError(error.message)
      return
    }
    
    setShowModal(false)
    fetchData()
  }

  const revoke = async (id: string) => {
    if (!confirm('Bạn có chắc muốn thu hồi quyền này?')) return
    const supabase = getSupabase()
    await supabase.from('role_delegations').update({ status: 'REVOKED' }).eq('id', id)
    fetchData()
  }

  return (
    <DashboardLayout title="Quản Lý Ủy Quyền">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-emerald-600" />
            Ủy Quyền Phó Phòng
          </h1>
          <button 
            onClick={() => {
              setSelectedDelegatee('')
              setStartDate('')
              setEndDate('')
              setError(null)
              setShowModal(true)
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 text-sm hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" /> Thêm Ủy Quyền
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Đang tải...</div>
        ) : delegations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
            Chưa có lịch sử ủy quyền nào.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Người Được Ủy Quyền</th>
                  <th className="px-6 py-4">Thời Gian</th>
                  <th className="px-6 py-4">Trạng Thái</th>
                  <th className="px-6 py-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {delegations.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {(d.delegatee as any)?.full_name || d.delegatee_id}
                    </td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(d.start_date).toLocaleDateString('vi')} - {new Date(d.end_date).toLocaleDateString('vi')}
                    </td>
                    <td className="px-6 py-4">
                      {d.status === 'ACTIVE' ? (
                        <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-semibold">Đang Hiệu Lực</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-semibold">Đã Thu Hồi</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {d.status === 'ACTIVE' && (
                        <button onClick={() => revoke(d.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto">
                          <Trash2 className="w-4 h-4" /> Thu Hồi
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">Thêm Ủy Quyền</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Chọn Phó Phòng (L3)</label>
                <select 
                  value={selectedDelegatee}
                  onChange={e => setSelectedDelegatee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500"
                >
                  <option value="">-- Chọn Phó Phòng --</option>
                  {l3Profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Từ ngày</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đến ngày</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-emerald-500" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">Lưu Ủy Quyền</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
