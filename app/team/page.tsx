"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import { getSupabase } from "@/lib/supabase/client"
import { fetchAllowedEmailsPage, fetchProfilesPage, invalidateApiCache } from "@/lib/supabase/api"
import { Profile, UserRole } from "@/types/models"
import { useState, useEffect, useCallback } from "react"
import { Users, UserPlus, Search, Pencil, Trash2, X, Check, Shield, ShieldCheck, UserCircle, Loader2, UserCheck, UserX } from "lucide-react"
import { TableSkeleton } from "@/components/skeletons"

type DialogMode = 'add' | 'edit' | null

const ITEMS_PER_PAGE = 50

interface AllowedEmail {
  id: string
  email: string
  full_name: string
  short_name?: string | null
  role: UserRole
  department_id: string | null
  is_active: boolean
  created_at: string
}

interface FormData {
  email: string
  full_name: string
  short_name: string
  role: UserRole
  department_id: string
}

const ROLE_LABELS: Record<UserRole, string> = {
  'ADMIN_LEVEL_0': 'Admin Hệ Thống',
  'ADMIN_LEVEL_1': 'Admin Cấp 1',
  'ADMIN_LEVEL_2': 'Admin Cấp 2',
  'ADMIN_LEVEL_3': 'Admin Cấp 3',
  'ADVISOR': 'Cố Vấn / Giám Sát',
  'USER': 'Chuyên Viên',
}

const ROLE_ICONS: Record<UserRole, typeof Shield> = {
  'ADMIN_LEVEL_0': ShieldCheck,
  'ADMIN_LEVEL_1': ShieldCheck,
  'ADMIN_LEVEL_2': Shield,
  'ADMIN_LEVEL_3': UserCheck,
  'ADVISOR': Search,
  'USER': UserCircle,
}

const EMPTY_FORM: FormData = { email: '', full_name: '', short_name: '', role: 'USER', department_id: '' }

export default function TeamPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [editingEntry, setEditingEntry] = useState<AllowedEmail | null>(null)
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalActive, setTotalActive] = useState(0)
  const [totalPending, setTotalPending] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [profilesPage, allowedPage] = await Promise.all([
      activeTab === 'active'
        ? fetchProfilesPage({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            search: searchQuery,
            includeInactive: true,
            user,
          })
        : fetchProfilesPage({ page: 1, pageSize: 1, includeInactive: true, user }),
      activeTab === 'pending'
        ? fetchAllowedEmailsPage({
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            search: searchQuery,
            includeInactive: true,
            user,
          })
        : fetchAllowedEmailsPage({ page: 1, pageSize: 1, includeInactive: true, user }),
    ])

    setProfiles(profilesPage.data as Profile[])
    setAllowedEmails(allowedPage.data as AllowedEmail[])
    setTotalActive(profilesPage.total)
    setTotalPending(allowedPage.total)
    setLoading(false)
  }, [activeTab, currentPage, searchQuery, user])

  useEffect(() => {
    if (mounted) fetchData()
  }, [mounted, fetchData])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  if (!mounted) return <TableSkeleton title="Quản Lý Nhân Sự" />

  if (user?.role !== 'ADMIN_LEVEL_0' && user?.role !== 'ADMIN_LEVEL_1' && user?.role !== 'ADMIN_LEVEL_2') {
    return (
      <DashboardLayout title="Quản Lý Nhân Sự">
        <div className="flex items-center justify-center h-[50vh] text-slate-500">
          Bạn không có quyền truy cập trang này. Chỉ Admin được phép.
        </div>
      </DashboardLayout>
    )
  }

  const filteredActive = profiles
  const filteredPending = allowedEmails
  const activeTotalPages = Math.max(1, Math.ceil(totalActive / ITEMS_PER_PAGE))
  const pendingTotalPages = Math.max(1, Math.ceil(totalPending / ITEMS_PER_PAGE))
  const totalPages = activeTab === 'active' ? activeTotalPages : pendingTotalPages
  const totalRows = activeTab === 'active' ? totalActive : totalPending
  const pageStart = totalRows === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1
  const pageEnd = Math.min(
    (currentPage - 1) * ITEMS_PER_PAGE + (activeTab === 'active' ? filteredActive.length : filteredPending.length),
    totalRows
  )
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    return start + index
  }).filter(page => page <= totalPages)

  const openAdd = () => {
    setFormData(EMPTY_FORM)
    setEditingEntry(null)
    setEditingProfile(null)
    setDialogMode('add')
    setError(null)
  }

  const openEditAllowed = (entry: AllowedEmail) => {
    setFormData({
      email: entry.email,
      full_name: entry.full_name,
      short_name: entry.short_name || '',
      role: entry.role,
      department_id: entry.department_id || '',
    })
    setEditingEntry(entry)
    setEditingProfile(null)
    setDialogMode('edit')
    setError(null)
  }

  const openEditProfile = (profile: Profile) => {
    setFormData({
      email: profile.email,
      full_name: profile.full_name,
      short_name: profile.short_name || '',
      role: profile.role,
      department_id: profile.department_id || '',
    })
    setEditingEntry(allowedEmails.find(ae => ae.email === profile.email) || null)
    setEditingProfile(profile)
    setDialogMode('edit')
    setError(null)
  }

  const closeDialog = () => {
    setDialogMode(null)
    setEditingEntry(null)
    setEditingProfile(null)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const supabase = getSupabase()

    if (!formData.email.trim() || !formData.full_name.trim()) {
      setError('Email và Họ tên không được để trống.')
      setSaving(false)
      return
    }

    if (dialogMode === 'add') {
      const { error: insertError } = await supabase
        .from('allowed_emails')
        .insert({
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name.trim(),
          short_name: formData.short_name.trim() || null,
          role: formData.role,
          department_id: formData.department_id.trim() || null,
          is_active: true,
        })

      if (insertError) {
        setError(insertError.message.includes('duplicate') ? 'Email đã tồn tại trong hệ thống.' : `Lỗi: ${insertError.message}`)
        setSaving(false)
        return
      }
    } else if (dialogMode === 'edit') {
      const allowedPayload = {
        email: formData.email.trim().toLowerCase(),
        full_name: formData.full_name.trim(),
        short_name: formData.short_name.trim() || null,
        role: formData.role,
        department_id: formData.department_id.trim() || null,
        is_active: true,
      }

      if (editingEntry) {
        const { error: updateError } = await supabase
          .from('allowed_emails')
          .update({
            full_name: allowedPayload.full_name,
            short_name: allowedPayload.short_name,
            role: allowedPayload.role,
            department_id: allowedPayload.department_id,
          })
          .eq('id', editingEntry.id)

        if (updateError) {
          setError(`Lỗi: ${updateError.message}`)
          setSaving(false)
          return
        }
      } else {
        const { error: insertAllowedError } = await supabase
          .from('allowed_emails')
          .insert(allowedPayload)

        if (insertAllowedError) {
          setError(`Lỗi: ${insertAllowedError.message}`)
          setSaving(false)
          return
        }
      }

      const matchingProfile = editingProfile || profiles.find(p => p.email === formData.email)
      if (matchingProfile) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name.trim(),
            short_name: formData.short_name.trim() || null,
            role: formData.role,
            department_id: formData.department_id.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchingProfile.id)

        if (profileUpdateError) {
          setError(`Lỗi: ${profileUpdateError.message}`)
          setSaving(false)
          return
        }
      }
    }

    invalidateApiCache('profiles:', 'allowed_emails:')
    await fetchData()
    closeDialog()
    setSaving(false)
  }

  const handleToggleActive = async (entry: AllowedEmail) => {
    const supabase = getSupabase()
    const newStatus = !entry.is_active
    await supabase.from('allowed_emails').update({ is_active: newStatus }).eq('id', entry.id)

    // Also toggle profile if exists
    const matchingProfile = profiles.find(p => p.email === entry.email)
    if (matchingProfile) {
      await supabase.from('profiles').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', matchingProfile.id)
    }
    invalidateApiCache('profiles:', 'allowed_emails:')
    await fetchData()
  }

  const handleToggleProfileActive = async (profile: Profile) => {
    const supabase = getSupabase()
    const newStatus = profile.is_active === false ? true : false
    await supabase.from('profiles').update({ is_active: newStatus, updated_at: new Date().toISOString() }).eq('id', profile.id)

    const matchingAllowed = allowedEmails.find(ae => ae.email === profile.email)
    if (matchingAllowed) {
      await supabase.from('allowed_emails').update({ is_active: newStatus }).eq('id', matchingAllowed.id)
    }
    invalidateApiCache('profiles:', 'allowed_emails:')
    await fetchData()
  }

  const handleDelete = async (id: string, email: string) => {
    const supabase = getSupabase()
    await supabase.from('allowed_emails').delete().eq('id', id)

    const matchingProfile = profiles.find(p => p.email === email)
    if (matchingProfile) {
      await supabase.from('profiles').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', matchingProfile.id)
    }
    invalidateApiCache('profiles:', 'allowed_emails:')
    await fetchData()
    setDeleteConfirm(null)
  }

  return (
    <DashboardLayout title="Quản Lý Nhân Sự">
      <div className="flex flex-col gap-6">
        {/* KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 md:p-5 rounded-2xl ring-1 ring-slate-900/5">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Đã Đăng Nhập</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800">{totalActive}</h3>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl ring-1 ring-slate-900/5">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Chờ Đăng Nhập</p>
            <h3 className="text-xl md:text-2xl font-bold text-amber-600">{totalPending}</h3>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl ring-1 ring-slate-900/5">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Admin Cấp 2</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800">{allowedEmails.filter(ae => ae.role === 'ADMIN_LEVEL_2').length}</h3>
          </div>
          <div className="bg-white p-4 md:p-5 rounded-2xl ring-1 ring-slate-900/5">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-1">Chuyên Viên</p>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800">{allowedEmails.filter(ae => ae.role === 'USER').length}</h3>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none"
            />
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0 shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Thêm Nhân Sự
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserCheck className="w-4 h-4 inline mr-1.5" />
            Đã Kích Hoạt ({totalActive})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <UserX className="w-4 h-4 inline mr-1.5" />
            Chờ Đăng Nhập ({totalPending})
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="ml-3 text-slate-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === 'active' ? (
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Nhân Sự</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Vai Trò</th>
                      <th className="py-3 px-4 font-semibold">Phòng Ban</th>
                      <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredActive.map(profile => {
                      const RoleIcon = ROLE_ICONS[profile.role]
                      const isActive = profile.is_active !== false
                      return (
                        <tr key={profile.id} className={`hover:bg-slate-50 transition-colors ${!isActive ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm shrink-0">
                                {profile.full_name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800 text-sm">{profile.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{profile.email}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <RoleIcon className="w-3.5 h-3.5" />
                              {ROLE_LABELS[profile.role]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{profile.department_id || '—'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                              {isActive ? 'Hoạt động' : 'Vô hiệu'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditProfile(profile)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Sửa tên, vai trò, phòng ban">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleToggleProfileActive(profile)}
                                className={`p-1.5 rounded-md transition-colors ${isActive ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
                              >
                                {isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredActive.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500">Chưa có nhân sự đăng nhập.</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Họ Tên</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Vai Trò</th>
                      <th className="py-3 px-4 font-semibold">Phòng Ban</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPending.map(entry => {
                      const RoleIcon = ROLE_ICONS[entry.role]
                      return (
                        <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${!entry.is_active ? 'opacity-50' : ''}`}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm shrink-0">
                                {entry.full_name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800 text-sm">{entry.full_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{entry.email}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <RoleIcon className="w-3.5 h-3.5" />
                              {ROLE_LABELS[entry.role]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{entry.department_id || '—'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => openEditAllowed(entry)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Sửa">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleToggleActive(entry)} className={`p-1.5 rounded-md transition-colors ${entry.is_active ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={entry.is_active ? 'Vô hiệu' : 'Kích hoạt'}>
                                {entry.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                              {deleteConfirm === entry.id ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleDelete(entry.id, entry.email)} className="p-1.5 text-rose-600 bg-rose-50 rounded-md text-xs font-medium">Xóa</button>
                                  <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md text-xs">Hủy</button>
                                </div>
                              ) : (
                                <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="Xóa">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredPending.length === 0 && (
                      <tr><td colSpan={5} className="py-8 text-center text-slate-500">Không có nhân sự chờ đăng nhập.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
          {!loading && (
            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span>
                {totalRows > 0 ? `Hiển thị ${pageStart} - ${pageEnd} / ${totalRows}` : 'Không có dữ liệu'}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded border bg-white px-2 py-1 font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    Trước
                  </button>
                  {pageNumbers.map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`rounded border px-3 py-1 font-medium transition-colors ${page === currentPage ? 'border-emerald-600 bg-emerald-600 text-white' : 'bg-white hover:bg-slate-50'}`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded border bg-white px-2 py-1 font-medium transition-colors hover:bg-slate-50 disabled:opacity-40"
                  >
                    Sau
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {dialogMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={closeDialog}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800">
                {dialogMode === 'add' ? 'Thêm Nhân Sự Mới' : 'Chỉnh Sửa'}
              </h3>
              <button onClick={closeDialog} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Google</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  disabled={dialogMode === 'edit'}
                  placeholder="nhansu@gmail.com"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                />
                {dialogMode === 'add' && (
                  <p className="text-xs text-slate-400 mt-1">Nhân sự sẽ dùng email Google này để đăng nhập.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và Tên</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên viết tắt (Dùng cho bảng biểu)</label>
                <input
                  type="text"
                  value={formData.short_name}
                  onChange={e => setFormData(p => ({ ...p, short_name: e.target.value }))}
                  placeholder="A, NV"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai Trò</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="USER">Chuyên Viên</option>
                  <option value="ADVISOR">Cố Vấn / Giám Sát</option>
                  <option value="ADMIN_LEVEL_3">Admin Cấp 3 (Phó Phòng)</option>
                  {(user?.role === 'ADMIN_LEVEL_0' || user?.role === 'ADMIN_LEVEL_1') && (
                    <>
                      <option value="ADMIN_LEVEL_2">Admin Cấp 2 (Trưởng Phòng)</option>
                      <option value="ADMIN_LEVEL_1">Admin Cấp 1 (Giám Đốc)</option>
                      {user?.role === 'ADMIN_LEVEL_0' && <option value="ADMIN_LEVEL_0">Admin Hệ Thống</option>}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mã Phòng Ban</label>
                <input
                  type="text"
                  value={formData.department_id}
                  onChange={e => setFormData(p => ({ ...p, department_id: e.target.value }))}
                  placeholder="VD: chi-nhanh-1"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeDialog} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Hủy</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-70 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {dialogMode === 'add' ? 'Thêm Nhân Sự' : 'Cập Nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
