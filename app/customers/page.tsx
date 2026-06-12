"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, ShoppingCart, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import * as XLSX from "xlsx"
import clsx from "clsx"
import { createCustomer, updateCustomer, getCustomerFullName, fetchCustomersPage, fetchProfilesPage } from "@/lib/supabase/api"
import { getSupabase } from "@/lib/supabase/client"
import { Modal, FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"

const PRODUCT_MAP = [
  { key: 'cif_moi', label: 'CIF Mới', short: 'CIF' },
  { key: 'smart_banking', label: 'Ngân Hàng Số', short: 'NHS' },
  { key: 'bao_hiem_nhan_tho', label: 'Bảo Hiểm Nhân Thọ', short: 'BHNT' },
  { key: 'bao_hiem_khoan_vay', label: 'Bảo Hiểm Khoản Vay', short: 'BHKV' },
  { key: 'the_tin_dung', label: 'Thẻ Tín Dụng', short: 'TTD' },
  { key: 'chuyen_tien_ngoai', label: 'Chuyển Tiền Ngoài', short: 'CTN' },
  { key: 'merchant_qr', label: 'Merchant QR', short: 'QR' },
]

const ITEMS_PER_PAGE = 25

function CustomerMetaBadges({ customer }: { customer: any }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {customer.cif_code && (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
          CIF: {customer.cif_code}
        </span>
      )}
      {customer.customer_type === 'ENTERPRISE' ? (
        <>
          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60 rounded">B2B</span>
          {customer.customer_segment && (
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
              {customer.customer_segment}
            </span>
          )}
        </>
      ) : (
        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">B2C</span>
      )}
      {customer.note && (
        <span className="text-[10px] text-slate-500 italic break-words">{customer.note}</span>
      )}
    </div>
  )
}

function CustomerProductTags({
  customer,
  updatingProduct,
  onToggleProduct,
}: {
  customer: any
  updatingProduct: { customerId: string; productKey: string } | null
  onToggleProduct: (customer: any, productKey: string, currentValue: boolean) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRODUCT_MAP.map(prod => {
        const hasProduct = !!customer[prod.key]
        const isUpdating = updatingProduct?.customerId === customer.id && updatingProduct?.productKey === prod.key
        return (
          <button
            key={prod.key}
            title={prod.label}
            disabled={isUpdating}
            onClick={() => onToggleProduct(customer, prod.key, hasProduct)}
            className={clsx(
              "font-semibold border rounded transition-all flex items-center gap-0.5 min-h-[28px] min-w-[36px] justify-center px-2 py-1 text-[11px]",
              hasProduct
                ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                : "bg-white border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700",
              isUpdating && "opacity-50 cursor-not-allowed"
            )}
          >
            {isUpdating && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
            {prod.short}
          </button>
        )
      })}
    </div>
  )
}

function CustomerActionButtons({ customerId }: { customerId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/sales?create=1&type=PRODUCT&customerId=${customerId}`}
        className="inline-flex items-center justify-center w-10 h-10 text-gold-600 hover:bg-gold-50 rounded-lg transition-colors border border-gold-200 bg-white shadow-sm active:scale-95"
        title="Ghi nhận bán hàng"
      >
        <ShoppingCart className="w-4 h-4" />
      </Link>
      <Link
        href={`/customers/${customerId}`}
        className="inline-flex items-center justify-center w-10 h-10 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm active:scale-95"
        title="Xem chi tiết hồ sơ"
      >
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

export default function CustomersPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2' || user?.role === 'ADMIN_LEVEL_3'
  const canEdit = user?.role !== 'ADVISOR'
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [totalCustomers, setTotalCustomers] = useState(0)
  const [profiles, setProfiles] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [customerType, setCustomerType] = useState<'INDIVIDUAL' | 'ENTERPRISE'>('INDIVIDUAL')
  const [updatingProduct, setUpdatingProduct] = useState<{customerId: string, productKey: string} | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkManagerId, setBulkManagerId] = useState("")
  const [bulkAssigning, setBulkAssigning] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [customersPage, profilesPage] = await Promise.all([
        fetchCustomersPage({
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
          search: searchQuery,
          user,
        }),
        fetchProfilesPage({
          page: 1,
          pageSize: 100,
          user,
        })
      ])
      setCustomers(customersPage.data)
      setTotalCustomers(customersPage.total)
      setProfiles(profilesPage.data)
    } catch (err: unknown) {
      const message = getErrorMessage(err)
      logger.error("[Customers] Failed to load customers", { error: message })
      toast.error('Lỗi tải dữ liệu: ' + message)
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchQuery, user])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const timeout = setTimeout(() => {
      loadData()
    }, searchQuery.trim() ? 250 : 0)

    return () => clearTimeout(timeout)
  }, [loadData, mounted, searchQuery])

  const visibleProfiles = useMemo(() => {
    return profiles
  }, [profiles])

  useEffect(() => { setCurrentPage(1); setSelectedIds([]) }, [searchQuery])
  useEffect(() => { setSelectedIds([]) }, [currentPage])

  const totalPages = Math.max(1, Math.ceil(totalCustomers / ITEMS_PER_PAGE))
  const paginatedCustomers = customers
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min((currentPage - 1) * ITEMS_PER_PAGE + customers.length, totalCustomers)

  const pageCustomerIds = useMemo(() => paginatedCustomers.map((c: any) => c.id), [paginatedCustomers])
  const isAllPageSelected = useMemo(() => pageCustomerIds.length > 0 && pageCustomerIds.every(id => selectedIds.includes(id)), [pageCustomerIds, selectedIds])
  const pageNumbers = useMemo(() => {
    const maxButtons = 5
    const half = Math.floor(maxButtons / 2)
    const start = Math.max(1, Math.min(currentPage - half, totalPages - maxButtons + 1))
    const end = Math.min(totalPages, start + maxButtons - 1)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [currentPage, totalPages])

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageCustomerIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const uniqueNew = pageCustomerIds.filter(id => !prev.includes(id))
        return [...prev, ...uniqueNew]
      })
    }
  }

  const handleToggleSelect = (customerId: string) => {
    setSelectedIds(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId) 
        : [...prev, customerId]
    )
  }

  const handleBulkAssign = async () => {
    if (!bulkManagerId) {
      toast.error("Vui lòng chọn chuyên viên để phân giao")
      return
    }
    try {
      setBulkAssigning(true)
      await Promise.all(selectedIds.map(id => updateCustomer(id, { assigned_manager_id: bulkManagerId })))
      toast.success(`Đã phân giao thành công ${selectedIds.length} khách hàng!`)
      setSelectedIds([])
      setBulkManagerId("")
      loadData()
    } catch (err: any) {
      toast.error("Lỗi phân giao: " + err.message)
    } finally {
      setBulkAssigning(false)
    }
  }

  if (!mounted) return null

  const handleAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      const isEnt = customerType === 'ENTERPRISE'
      const bName = (form.get('business_name') as string || '').trim()
      const repName = (form.get('representative_name') as string || '').trim()
      const fName = isEnt ? bName : (form.get('full_name') as string || '').trim()

      await createCustomer({
        customer_type: customerType,
        full_name: fName,
        business_name: isEnt ? bName : '',
        tax_code: isEnt ? (form.get('tax_code') as string || '') : '',
        representative_name: isEnt ? repName : '',
        cif_code: form.get('cif_code') as string || undefined,
        phone: form.get('phone') as string || undefined,
        email: form.get('email') as string || undefined,
        address: form.get('address') as string || undefined,
        note: form.get('note') as string || undefined,
        assigned_manager_id: (form.get('assigned_manager_id') as string) || user!.id,
        customer_segment: isEnt ? (form.get('customer_segment') as string || 'SME') : '',
        cif_moi: form.get('cif_moi') === 'on',
        smart_banking: form.get('smart_banking') === 'on',
        bao_hiem_nhan_tho: form.get('bao_hiem_nhan_tho') === 'on',
        bao_hiem_khoan_vay: form.get('bao_hiem_khoan_vay') === 'on',
        the_tin_dung: form.get('the_tin_dung') === 'on',
        chuyen_tien_ngoai: form.get('chuyen_tien_ngoai') === 'on',
        merchant_qr: form.get('merchant_qr') === 'on',
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

  const handleToggleProduct = async (customer: any, productKey: string, currentValue: boolean) => {
    try {
      setUpdatingProduct({ customerId: customer.id, productKey })
      await updateCustomer(customer.id, { [productKey]: !currentValue })
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, [productKey]: !currentValue } : c))
      toast.success(`Đã ${!currentValue ? 'thêm' : 'hủy'} sản phẩm cho ${getCustomerFullName(customer)}`)
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setUpdatingProduct(null)
    }
  }

  const maskMiddleText = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, ' ')
    if (!normalized) return ''
    const parts = normalized.split(' ')
    if (parts.length >= 2) {
      return `${parts[0]} xxxxx ${parts[parts.length - 1]}`
    }
    if (normalized.length <= 2) return `${normalized[0] || ''}xxxxx`
    return `${normalized[0]}xxxxx${normalized[normalized.length - 1]}`
  }

  const maskPhone = (value: string) => {
    const normalized = value.trim()
    if (!normalized) return ''
    if (normalized.length <= 5) return 'xxxxx'
    return `${normalized.slice(0, 3)}xxxxx${normalized.slice(-2)}`
  }

  const handleExportData = () => {
    const exportData = customers.map((c: any) => ({
      "Mã KH": c.id,
      "Mã CIF": c.cif_code || '',
      "Loại KH": c.customer_type === 'ENTERPRISE' ? 'Doanh nghiệp' : 'Cá nhân',
      "Tên Khách Hàng / Doanh Nghiệp": maskMiddleText(getCustomerFullName(c)),
      "Mã Số Thuế": c.tax_code || '',
      "Người Đại Diện": c.representative_name || '',
      "Số điện thoại": maskPhone(c.phone || ''),
      "Email": c.email || '',
      "Địa chỉ": c.address || '',
      "Ghi chú": c.note || '',
      "Phòng quản lý": c.department_id || '',
      "Chuyên viên": c.profiles?.full_name || '',
      "Số tài khoản": "",
      "Dư nợ": "",
      "Huy động": "",
      "CIF Mới": c.cif_moi ? "1" : "0",
      "Ngân Hàng Số": c.smart_banking ? "1" : "0",
      "Bảo Hiểm Nhân Thọ": c.bao_hiem_nhan_tho ? "1" : "0",
      "Bảo Hiểm Khoản Vay": c.bao_hiem_khoan_vay ? "1" : "0",
      "Thẻ Tín Dụng": c.the_tin_dung ? "1" : "0",
      "Chuyển Tiền Ngoài": c.chuyen_tien_ngoai ? "1" : "0",
      "Merchant QR": c.merchant_qr ? "1" : "0",
    }))
    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachKhachHang")
    XLSX.writeFile(workbook, "danh_sach_khach_hang.xlsx")
  }

  const handleDownloadSample = () => {
    const sampleData = [{ 
      "Mã CIF (Tùy chọn)": "",
      "Loại KH (INDIVIDUAL/ENTERPRISE)": "INDIVIDUAL", 
      "Tên KH / Doanh Nghiệp": "Nguyễn Văn An", 
      "Người Đại Diện (nếu là Doanh nghiệp)": "",
      "Mã Số Thuế": "",
      "Số điện thoại": "0901234567", 
      "Email": "an@email.com", 
      "Địa chỉ": "123 ABC",
      "Phòng quản lý": "Phòng KHDN1",
      "Chuyên viên": "",
      "Số tài khoản": "123456789",
      "Dư nợ": "100000000",
      "Huy động": "50000000",
      "CIF Mới": "1",
      "Ngân Hàng Số": "1",
      "Bảo Hiểm Nhân Thọ": "0",
      "Bảo Hiểm Khoản Vay": "0",
      "Thẻ Tín Dụng": "0",
      "Chuyển Tiền Ngoài": "0",
      "Merchant QR": "0",
    }]
    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "KhachHang")
    XLSX.writeFile(workbook, "mau_khach_hang.xlsx")
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (importing) return

    setImporting(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/customers/import', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Không thể nhập dữ liệu.')
      }

      if (payload.failed > 0) {
        toast.error(`Đã nhập ${payload.success}/${payload.total}. ${payload.failed} dòng lỗi.`)
        if (payload.errors?.length) {
          logger.warn('[Customers] Import row errors', { errors: payload.errors })
        }
      } else {
        toast.success(`Đã nhập ${payload.success}/${payload.total} khách hàng!`)
      }

      await loadData()
    } catch (err: unknown) {
      toast.error('Lỗi nhập file: ' + getErrorMessage(err))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {isAdmin && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <div className="flex w-full sm:w-auto bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden divide-x divide-slate-200 text-slate-700">
                  <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2.5 sm:py-2 hover:bg-emerald-50 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed" title="Upload dữ liệu">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Nhập
                  </button>
                  <button onClick={handleExportData} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2.5 sm:py-2 hover:bg-emerald-50 transition-colors text-sm font-medium" title="Xuất Excel trang hiện tại">
                    <Download className="w-4 h-4" /> Xuất
                  </button>
                  <button onClick={handleDownloadSample} className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2.5 sm:py-2 hover:bg-emerald-50 transition-colors text-sm font-medium text-emerald-700" title="File mẫu">
                    <FileSpreadsheet className="w-4 h-4" /> Mẫu
                  </button>
                </div>
              </>
            )}
            {canEdit && (
              <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-emerald-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm font-medium">
                <Plus className="w-4 h-4" /> Thêm KH
              </button>
            )}
          </div>
        </div>

        {searchQuery && (
          <p className="text-sm text-slate-500">
            Tìm thấy <span className="font-semibold text-slate-700">{totalCustomers}</span> kết quả
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
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-emerald-50/60 border-b border-emerald-100">
                    <tr className="text-sm text-emerald-800 font-medium">
                      {isAdmin && (
                        <th className="py-3 px-4 w-12">
                          <input
                            type="checkbox"
                            checked={isAllPageSelected}
                            onChange={handleToggleSelectAllPage}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            aria-label="Chọn tất cả khách hàng trên trang"
                          />
                        </th>
                      )}
                      <th className="py-3 px-4 font-semibold min-w-[220px]">Khách Hàng</th>
                      <th className="py-3 px-4 font-semibold min-w-[200px]">Sản Phẩm</th>
                      <th className="py-3 px-4 font-semibold min-w-[140px]">Chuyên Viên</th>
                      <th className="py-3 px-4 w-28 text-right font-semibold">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.map((customer: any) => (
                      <tr key={customer.id} className={clsx("hover:bg-emerald-50/30 transition-colors", selectedIds.includes(customer.id) && "bg-emerald-50/50")}>
                        {isAdmin && (
                          <td className="py-3 px-4 align-top">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(customer.id)}
                              onChange={() => handleToggleSelect(customer.id)}
                              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                              aria-label={`Chọn khách hàng ${getCustomerFullName(customer)}`}
                            />
                          </td>
                        )}
                        <td className="py-3 px-4 align-top">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors block break-words leading-snug"
                          >
                            {getCustomerFullName(customer)}
                          </Link>
                          <CustomerMetaBadges customer={customer} />
                        </td>
                        <td className="py-3 px-4 align-top">
                          <CustomerProductTags
                            customer={customer}
                            updatingProduct={updatingProduct}
                            onToggleProduct={handleToggleProduct}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 align-top">
                          <span className="block break-words leading-snug">
                            {customer.profiles?.full_name || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 align-top">
                          <div className="flex items-center justify-end">
                            <CustomerActionButtons customerId={customer.id} />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-500">
                          {searchQuery ? `Không tìm thấy khách hàng với "${searchQuery}"` : "Chưa có khách hàng nào. Bấm \"Thêm KH\" để bắt đầu."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedCustomers.map((customer: any) => (
                  <article
                    key={customer.id}
                    className={clsx(
                      "p-4 space-y-3 transition-colors",
                      selectedIds.includes(customer.id) ? "bg-emerald-50/60" : "bg-white"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {isAdmin && (
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(customer.id)}
                          onChange={() => handleToggleSelect(customer.id)}
                          className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-5 h-5 shrink-0"
                          aria-label={`Chọn khách hàng ${getCustomerFullName(customer)}`}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-[15px] font-semibold text-slate-800 hover:text-emerald-600 transition-colors block break-words leading-snug"
                        >
                          {getCustomerFullName(customer)}
                        </Link>
                        <CustomerMetaBadges customer={customer} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Sản phẩm</p>
                      <CustomerProductTags
                        customer={customer}
                        updatingProduct={updatingProduct}
                        onToggleProduct={handleToggleProduct}
                      />
                    </div>

                    <div className="flex flex-wrap items-start gap-x-2 gap-y-1 text-sm">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 shrink-0">Chuyên viên</span>
                      <span className="text-slate-600 break-words flex-1">{customer.profiles?.full_name || '—'}</span>
                    </div>

                    <div className="flex justify-end pt-1 border-t border-slate-100">
                      <CustomerActionButtons customerId={customer.id} />
                    </div>
                  </article>
                ))}
                {customers.length === 0 && (
                  <div className="py-12 px-4 text-center text-slate-500">
                    {searchQuery ? `Không tìm thấy khách hàng với "${searchQuery}"` : "Chưa có khách hàng nào. Bấm \"Thêm KH\" để bắt đầu."}
                  </div>
                )}
              </div>

              <div className="px-3 sm:px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-500">
                <span>
                  {totalCustomers > 0
                    ? `Hiển thị ${startIndex} - ${endIndex} / ${totalCustomers}`
                    : "Không có khách hàng"}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {pageNumbers.map(page => (
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
        
        {/* Bulk Actions Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-2xl bg-emerald-900 text-white rounded-2xl px-4 sm:px-6 py-4 shadow-2xl flex flex-col sm:flex-row sm:items-center gap-4 z-50 border border-emerald-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="text-sm font-semibold text-emerald-100">
              Đã chọn <strong className="text-gold-400 font-bold">{selectedIds.length}</strong> khách hàng
            </span>
            <div className="hidden sm:block h-4 w-px bg-emerald-700" />
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={bulkManagerId}
                onChange={(e) => setBulkManagerId(e.target.value)}
                className="px-3 py-2.5 sm:py-1.5 bg-emerald-800 border border-emerald-700 rounded-lg text-sm sm:text-xs outline-none focus:ring-2 focus:ring-gold-400 text-white w-full sm:w-auto"
                aria-label="Chọn chuyên viên để phân giao hàng loạt"
              >
                <option value="">Chọn chuyên viên...</option>
                {visibleProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkAssign}
                  disabled={!bulkManagerId || bulkAssigning}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm sm:text-xs font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-1 shadow-sm"
                >
                  {bulkAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                  Phân giao
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="flex-1 sm:flex-none px-4 py-2.5 sm:py-1.5 bg-emerald-800 hover:bg-emerald-700 text-emerald-100 rounded-lg text-sm sm:text-xs font-bold transition-all"
                >
                  Hủy chọn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Thêm Khách Hàng Mới">
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <FormField label="Phân Loại Khách Hàng" required>
            <FormSelect 
              value={customerType} 
              onChange={(e) => setCustomerType(e.target.value as any)}
            >
              <option value="INDIVIDUAL">Cá Nhân (B2C)</option>
              <option value="ENTERPRISE">Doanh Nghiệp (B2B)</option>
            </FormSelect>
          </FormField>

          {customerType === 'ENTERPRISE' ? (
            <>
              <FormField label="Phân Khúc Doanh Nghiệp" required>
                <FormSelect name="customer_segment" required>
                  <option value="SME">SME</option>
                  <option value="Hành chính sự nghiệp">Hành chính sự nghiệp</option>
                  <option value="Doanh nghiệp lớn">Doanh nghiệp lớn</option>
                  <option value="FDI">FDI</option>
                  <option value="Khác">Khác</option>
                </FormSelect>
              </FormField>
              <FormField label="Tên Doanh Nghiệp" required>
                <FormInput name="business_name" required placeholder="VD: Công ty TNHH ABC" />
              </FormField>
              <FormField label="Mã Số Thuế">
                <FormInput name="tax_code" placeholder="Mã số thuế" />
              </FormField>
              <FormField label="Người đại diện" required>
                <FormInput name="representative_name" required placeholder="Họ và tên người đại diện" />
              </FormField>
            </>
          ) : (
            <FormField label="Họ và Tên" required>
              <FormInput name="full_name" required placeholder="Nguyễn Văn An" />
            </FormField>
          )}
          <FormField label="Mã CIF (Tùy chọn)">
            <FormInput name="cif_code" placeholder="Nhập mã CIF nếu có" />
          </FormField>
          <FormField label="Số điện thoại">
            <FormInput name="phone" type="tel" placeholder="0901234567" />
          </FormField>
          <FormField label="Email">
            <FormInput name="email" type="email" placeholder="email@example.com" />
          </FormField>
          <FormField label="Địa chỉ">
            <FormInput name="address" placeholder="123 Đường ABC, Quận XYZ" />
          </FormField>
          {isAdmin && visibleProfiles.length > 0 && (
            <FormField label="Chuyên viên phụ trách">
              <FormSelect name="assigned_manager_id" defaultValue={user?.id}>
                {visibleProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </FormSelect>
            </FormField>
          )}
          
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700">Sản phẩm hiện có</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRODUCT_MAP.map(prod => (
                <label key={prod.key} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input type="checkbox" name={prod.key} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
                  {prod.label}
                </label>
              ))}
            </div>
          </div>

          <FormField label="Ghi chú">
            <FormTextarea name="note" placeholder="Ghi chú thêm về khách hàng..." />
          </FormField>
          <SubmitButton loading={formLoading}>Thêm Khách Hàng</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
