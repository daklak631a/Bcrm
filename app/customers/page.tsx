"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import * as XLSX from "xlsx"
import clsx from "clsx"
import { fetchCustomers, createCustomer, getCustomerFullName, fetchProfiles } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 10

export default function CustomersPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [customersData, profilesData] = await Promise.all([
        fetchCustomers(),
        fetchProfiles()
      ])
      setCustomers(customersData)
      setProfiles(profilesData)
    } catch (err: any) {
      console.error('Error loading customers:', err)
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers
    const q = searchQuery.toLowerCase().trim()
    return customers.filter((c: any) => {
      const fullName = getCustomerFullName(c).toLowerCase()
      return fullName.includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    })
  }, [customers, searchQuery])

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)

  if (!mounted) return null

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createCustomer({
        first_name: form.get('first_name') as string,
        last_name: form.get('last_name') as string,
        phone: form.get('phone') as string || undefined,
        email: form.get('email') as string || undefined,
        address: form.get('address') as string || undefined,
        note: form.get('note') as string || undefined,
        assigned_manager_id: (form.get('assigned_manager_id') as string) || user!.id,
      })
      toast.success('Thêm khách hàng thành công!')
      setShowAddModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleExportData = () => {
    const exportData = filteredCustomers.map((c: any) => ({
      "Mã KH": c.id,
      "Họ": c.last_name,
      "Tên": c.first_name,
      "Số điện thoại": c.phone || '',
      "Email": c.email || '',
      "Địa chỉ": c.address || '',
      "Ghi chú": c.note || '',
      "Chuyên viên": c.profiles?.full_name || '',
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachKhachHang")
    XLSX.writeFile(workbook, "danh_sach_khach_hang.xlsx")
  }

  const handleDownloadSample = () => {
    const sampleData = [{ "Họ": "Nguyễn Văn", "Tên": "An", "Số điện thoại": "0901234567", "Email": "an@email.com", "Địa chỉ": "123 ABC" }]
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "KhachHang")
    XLSX.writeFile(workbook, "mau_khach_hang.xlsx")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target?.result
      if (!bstr) return
      const workbook = XLSX.read(bstr, { type: 'binary' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(worksheet) as any[]
      
      let successCount = 0
      for (const item of data) {
        try {
          await createCustomer({
            first_name: item["Tên"] || item.first_name || "N/A",
            last_name: item["Họ"] || item.last_name || "N/A",
            phone: item["Số điện thoại"] || item.phone || undefined,
            email: item["Email"] || item.email || undefined,
            address: item["Địa chỉ"] || item.address || undefined,
            assigned_manager_id: user!.id,
          })
          successCount++
        } catch (err) {
          console.error('Import error for row:', item, err)
        }
      }
      toast.success(`Đã nhập ${successCount}/${data.length} khách hàng!`)
      loadData()
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsBinaryString(file)
  }

  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2'

  return (
    <DashboardLayout title="Danh Sách Khách Hàng">
      <div className="flex flex-col gap-6">
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên, SĐT, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <div className="flex bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden divide-x divide-slate-200 text-slate-700">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium" title="Upload dữ liệu">
                    <Upload className="w-4 h-4" /> Nhập
                  </button>
                  <button onClick={handleExportData} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium" title="Xuất Excel">
                    <Download className="w-4 h-4" /> Xuất
                  </button>
                  <button onClick={handleDownloadSample} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium text-emerald-600" title="File mẫu">
                    <FileSpreadsheet className="w-4 h-4" /> Mẫu
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Thêm KH
            </button>
          </div>
        </div>

        {searchQuery && (
          <p className="text-sm text-slate-500">
            Tìm thấy <span className="font-semibold text-slate-700">{filteredCustomers.length}</span> kết quả
          </p>
        )}

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Họ Tên</th>
                      <th className="py-3 px-4 font-semibold">Liên Hệ</th>
                      <th className="py-3 px-4 font-semibold">Địa Chỉ</th>
                      <th className="py-3 px-4 font-semibold">Chuyên Viên</th>
                      <th className="py-3 px-4 font-semibold">Ngày Tạo</th>
                      <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.map((customer: any) => (
                      <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-slate-800">{getCustomerFullName(customer)}</p>
                          {customer.note && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{customer.note}</p>}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700">{customer.phone || '—'}</span>
                            <span className="text-xs text-slate-500">{customer.email || ''}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 max-w-[200px] truncate">{customer.address || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-700">{customer.profiles?.full_name || '—'}</td>
                        <td className="py-3 px-4 text-sm text-slate-500">{new Date(customer.created_at).toLocaleDateString('vi-VN')}</td>
                        <td className="py-3 px-4 text-right">
                          <button className="inline-flex p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          {searchQuery ? `Không tìm thấy khách hàng với "${searchQuery}"` : "Chưa có khách hàng nào. Bấm \"Thêm KH\" để bắt đầu."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                <span>
                  {filteredCustomers.length > 0
                    ? `Hiển thị ${startIndex} - ${endIndex} / ${filteredCustomers.length}`
                    : "Không có khách hàng"}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setCurrentPage(page)} className={clsx("px-3 py-1 border rounded text-sm font-medium transition-colors", page === currentPage ? "bg-emerald-600 text-white border-emerald-600" : "bg-white hover:bg-slate-50")}>
                        {page}
                      </button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Thêm Khách Hàng Mới">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Họ" required>
              <FormInput name="last_name" required placeholder="Nguyễn Văn" />
            </FormField>
            <FormField label="Tên" required>
              <FormInput name="first_name" required placeholder="An" />
            </FormField>
          </div>
          <FormField label="Số điện thoại">
            <FormInput name="phone" type="tel" placeholder="0901234567" />
          </FormField>
          <FormField label="Email">
            <FormInput name="email" type="email" placeholder="email@example.com" />
          </FormField>
          <FormField label="Địa chỉ">
            <FormInput name="address" placeholder="123 Đường ABC, Quận XYZ" />
          </FormField>
          {isAdmin && profiles.length > 0 && (
            <FormField label="Chuyên viên phụ trách">
              <FormSelect name="assigned_manager_id" defaultValue={user?.id}>
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </FormSelect>
            </FormField>
          )}
          <FormField label="Ghi chú">
            <FormTextarea name="note" placeholder="Ghi chú thêm về khách hàng..." />
          </FormField>
          <SubmitButton loading={formLoading}>Thêm Khách Hàng</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
