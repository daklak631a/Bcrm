"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import {
  createDepartment,
  fetchDepartmentsPage,
  invalidateApiCache,
  updateDepartment,
  type Department,
} from "@/lib/supabase/api"
import { useCallback, useEffect, useState } from "react"
import { Building2, Loader2, Pencil, Plus, X, Check } from "lucide-react"
import { toast } from "sonner"

type FormState = {
  code: string
  name: string
  description: string
}

const EMPTY_FORM: FormState = { code: '', name: '', description: '' }

export default function DepartmentsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)

  const canManage = user?.role === 'ADMIN_LEVEL_0' || user?.role === 'ADMIN_LEVEL_1'

  const load = useCallback(async () => {
    setLoading(true)
    const page = await fetchDepartmentsPage({ page: 1, pageSize: 200, includeInactive: true })
    setDepartments(page.data)
    setLoading(false)
  }, [])

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted) load() }, [mounted, load])

  if (!mounted) return null

  if (!canManage) {
    return (
      <DashboardLayout title="Danh Sách Phòng Ban">
        <div className="flex h-[50vh] items-center justify-center text-slate-500">
          Chỉ Admin Cấp 1 trở lên được quản lý danh sách phòng ban.
        </div>
      </DashboardLayout>
    )
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setDialogOpen(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
    })
    setError(null)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Mã phòng và tên phòng không được để trống.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      if (editing) {
        await updateDepartment(editing.id, {
          code: form.code,
          name: form.name,
          description: form.description,
        })
        toast.success('Đã cập nhật phòng ban.')
      } else {
        await createDepartment({
          code: form.code,
          name: form.name,
          description: form.description,
        })
        toast.success('Đã thêm phòng ban.')
      }
      invalidateApiCache('departments:')
      setDialogOpen(false)
      await load()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể lưu phòng ban.'
      setError(message.includes('duplicate') ? 'Mã phòng đã tồn tại.' : message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (dept: Department) => {
    try {
      await updateDepartment(dept.id, { is_active: !dept.is_active })
      invalidateApiCache('departments:')
      toast.success(dept.is_active ? 'Đã vô hiệu phòng ban.' : 'Đã kích hoạt phòng ban.')
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái.')
    }
  }

  return (
    <DashboardLayout title="Danh Sách Phòng Ban">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            Tạo danh sách phòng chuẩn để gán nhân sự và phân bổ khách hàng theo phòng.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Thêm Phòng
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-500" /> Đang tải...
            </div>
          ) : (
            <table className="min-w-full text-left">
              <thead className="border-b border-slate-200 bg-slate-50 text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã phòng</th>
                  <th className="px-4 py-3 font-semibold">Tên hiển thị</th>
                  <th className="px-4 py-3 font-semibold">Mô tả</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map(dept => (
                  <tr key={dept.id} className={!dept.is_active ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{dept.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{dept.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{dept.description || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${dept.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {dept.is_active ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(dept)} className="rounded-md p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => toggleActive(dept)} className="rounded-md p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title={dept.is_active ? 'Vô hiệu' : 'Kích hoạt'}>
                          {dept.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      <Building2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      Chưa có phòng ban. Nhấn &quot;Thêm Phòng&quot; để tạo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setDialogOpen(false)}>
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              {editing ? 'Chỉnh sửa phòng ban' : 'Thêm phòng ban mới'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mã phòng (dùng khi import / gán nhân sự)</label>
                <input
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="VD: Phòng KHDN1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Tên hiển thị</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Phòng Kinh doanh Doanh nghiệp 1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả (tùy chọn)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDialogOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-70">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Cập nhật' : 'Thêm phòng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
