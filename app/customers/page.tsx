"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, Download, Upload, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, ShoppingCart, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useRef, useMemo, useCallback } from "react"
import * as XLSX from "xlsx"
import clsx from "clsx"
import { fetchCustomers, createCustomer, updateCustomer, getCustomerFullName, fetchProfiles, createLoan, createDeposit } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, FormTextarea, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

const PRODUCT_MAP = [
  { key: 'cif_moi', label: 'CIF Mới', short: 'CIF' },
  { key: 'smart_banking', label: 'Ngân Hàng Số', short: 'NHS' },
  { key: 'bao_hiem_nhan_tho', label: 'Bảo Hiểm Nhân Thọ', short: 'BHNT' },
  { key: 'bao_hiem_khoan_vay', label: 'Bảo Hiểm Khoản Vay', short: 'BHKV' },
  { key: 'the_tin_dung', label: 'Thẻ Tín Dụng', short: 'TTD' },
  { key: 'chuyen_tien_ngoai', label: 'Chuyển Tiền Ngoài', short: 'CTN' },
  { key: 'merchant_qr', label: 'Merchant QR', short: 'QR' },
]

function slugify(text: string) {
  return text.toString().toLowerCase()
    .normalize('NFD') // separate accents from letters
    .replace(/[\u0300-\u036f]/g, '') // remove all separated accents
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]/g, '') // remove non-alphanumeric
}

const ITEMS_PER_PAGE = 10

function parseBooleanCell(value: any) {
  const normalized = String(value ?? '').trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'x', 'có', 'co'].includes(normalized)
}

function parseNumberCell(value: any) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(/[^\d.-]/g, '')
  return Number(normalized) || 0
}

export default function CustomersPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2' || user?.role === 'ADMIN_LEVEL_3'
  const canEdit = user?.role !== 'ADVISOR'
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
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

  const visibleProfiles = useMemo(() => {
    if (user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADVISOR') return profiles
    if (user?.role === 'ADMIN_LEVEL_2' || user?.role === 'ADMIN_LEVEL_3') return profiles.filter((profile: any) => profile.department_id === user.department_id)
    return profiles.filter((profile: any) => profile.id === user?.id)
  }, [profiles, user?.department_id, user?.id, user?.role])

  const visibleProfileIds = useMemo(() => new Set(visibleProfiles.map((profile: any) => profile.id)), [visibleProfiles])
  const visibleCustomers = useMemo(() => {
    return customers.filter((customer: any) => visibleProfileIds.has(customer.assigned_manager_id))
  }, [customers, visibleProfileIds])

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return visibleCustomers
    const q = searchQuery.toLowerCase().trim()
    return visibleCustomers.filter((c: any) => {
      const fullName = getCustomerFullName(c).toLowerCase()
      return fullName.includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    })
  }, [visibleCustomers, searchQuery])

  useEffect(() => { setCurrentPage(1); setSelectedIds([]) }, [searchQuery])
  useEffect(() => { setSelectedIds([]) }, [currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE))
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredCustomers.length)

  const pageCustomerIds = useMemo(() => paginatedCustomers.map((c: any) => c.id), [paginatedCustomers])
  const isAllPageSelected = useMemo(() => pageCustomerIds.length > 0 && pageCustomerIds.every(id => selectedIds.includes(id)), [pageCustomerIds, selectedIds])

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
    const exportData = filteredCustomers.map((c: any) => ({
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
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        setImporting(true)
        const bstr = evt.target?.result
        if (!bstr) return
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(worksheet) as any[]
        
        if (data.length === 0) {
          toast.error('File không có dữ liệu để nhập')
          return
        }

        let successCount = 0
        const failedRows: string[] = []
        const seenCifs = new Set<string>()
        for (let index = 0; index < data.length; index++) {
          const item = data[index]
          const rowNumber = index + 2
          try {
            const type = String(item["Loại KH (INDIVIDUAL/ENTERPRISE)"] || "INDIVIDUAL").trim().toUpperCase()
            const name = String(item["Tên KH / Doanh Nghiệp"] || item.full_name || item.business_name || "").trim()
            const rep = String(item["Người Đại Diện (nếu là Doanh nghiệp)"] || item.representative_name || "").trim()
            const tax = String(item["Mã Số Thuế"] || item.tax_code || "").trim()
            const cif = String(item["Mã CIF (Tùy chọn)"] || item["Mã CIF"] || item.cif_code || "").trim()
            
            if (!['INDIVIDUAL', 'ENTERPRISE'].includes(type)) {
              throw new Error('Loại KH không hợp lệ')
            }
            if (!name) {
              throw new Error('Thiếu tên khách hàng/doanh nghiệp')
            }
            if (cif) {
              const normalizedCif = cif.toLowerCase()
              if (seenCifs.has(normalizedCif)) {
                throw new Error('Trùng mã CIF trong file')
              }
              seenCifs.add(normalizedCif)
            }

            let managerId = user!.id
            const managerName = String(item["Chuyên viên"] || item["Chuyen vien"] || item.assigned_manager_id || "").trim()
            if (managerName && isAdmin) {
               const sluggedName = slugify(managerName)
               const matchedProfile = visibleProfiles.find(p => slugify(p.full_name) === sluggedName || p.id === managerName)
               if (matchedProfile) {
                  managerId = matchedProfile.id
               }
            }

            let existingCustomer = null
            if (cif) {
              existingCustomer = visibleCustomers.find(c => c.cif_code?.toLowerCase() === cif.toLowerCase())
            }
            if (!existingCustomer && tax && type === 'ENTERPRISE') {
              existingCustomer = visibleCustomers.find(c => c.tax_code === tax)
            }
            if (!existingCustomer && item["Số điện thoại"] || item.phone) {
              const p = String(item["Số điện thoại"] || item.phone || "").trim()
              if (p) existingCustomer = visibleCustomers.find(c => c.phone === p)
            }

            const customerPayload = {
              customer_type: type,
              full_name: name,
              business_name: type === 'ENTERPRISE' ? name : '',
              representative_name: type === 'ENTERPRISE' ? rep : '',
              tax_code: type === 'ENTERPRISE' ? tax : '',
              cif_code: cif || undefined,
              phone: item["Số điện thoại"] || item.phone || undefined,
              email: item["Email"] || item.email || undefined,
              address: item["Địa chỉ"] || item.address || undefined,
              assigned_manager_id: managerId,
              cif_moi: parseBooleanCell(item["CIF Mới"]),
              smart_banking: parseBooleanCell(item["Ngân Hàng Số"]),
              bao_hiem_nhan_tho: parseBooleanCell(item["Bảo Hiểm Nhân Thọ"]),
              bao_hiem_khoan_vay: parseBooleanCell(item["Bảo Hiểm Khoản Vay"]),
              the_tin_dung: parseBooleanCell(item["Thẻ Tín Dụng"]),
              chuyen_tien_ngoai: parseBooleanCell(item["Chuyển Tiền Ngoài"]),
              merchant_qr: parseBooleanCell(item["Merchant QR"]),
            }

            let customerData: any = null
            if (existingCustomer) {
              customerData = await updateCustomer(existingCustomer.id, customerPayload)
            } else {
              customerData = await createCustomer(customerPayload)
            }

            const accNo = item["Số tài khoản"] ? String(item["Số tài khoản"]).trim() : ""
            const duNo = parseNumberCell(item["Dư nợ"])
            const huyDong = parseNumberCell(item["Huy động"])
            
            if (accNo && duNo > 0) {
               await createLoan({
                  customer_id: customerData.id,
                  account_number: accNo,
                  loan_amount: duNo,
                  balance: duNo,
                  start_date: new Date().toISOString(),
                  due_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                  status: 'ACTIVE'
               })
            }
            
            if (accNo && huyDong > 0) {
               await createDeposit({
                  customer_id: customerData.id,
                  account_number: accNo,
                  amount: huyDong,
                  start_date: new Date().toISOString(),
                  maturity_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                  status: 'ACTIVE'
               })
            }

            successCount++
          } catch (err: any) {
            failedRows.push(`Dòng ${rowNumber}: ${err.message || 'Không rõ lỗi'}`)
            console.error('Import error for row:', item, err)
          }
        }
        if (failedRows.length > 0) {
          toast.error(`Đã nhập ${successCount}/${data.length}. ${failedRows.length} dòng lỗi. Xem console để biết chi tiết.`)
          console.table(failedRows)
        } else {
          toast.success(`Đã nhập ${successCount}/${data.length} khách hàng!`)
        }
        loadData()
      } catch (err: any) {
        toast.error('Lỗi đọc file: ' + (err.message || 'Không rõ lỗi'))
      } finally {
        setImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsBinaryString(file)
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <div className="flex bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden divide-x divide-slate-200 text-slate-700">
                  <button disabled={importing} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed" title="Upload dữ liệu">
                    {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Nhập
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
            {canEdit && (
              <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm font-medium whitespace-nowrap">
                <Plus className="w-4 h-4" /> Thêm KH
              </button>
            )}
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
                <table className="w-full text-left border-collapse min-w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      {isAdmin && (
                        <th className="py-3 px-4 w-10">
                          <input 
                            type="checkbox" 
                            checked={isAllPageSelected}
                            onChange={handleToggleSelectAllPage}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            aria-label="Chọn tất cả khách hàng trên trang"
                          />
                        </th>
                      )}
                      <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                      <th className="py-3 px-4 font-semibold hidden md:table-cell">Sản Phẩm</th>
                      <th className="py-3 px-4 font-semibold hidden lg:table-cell">Chuyên Viên</th>
                      <th className="py-3 px-4 w-20 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedCustomers.map((customer: any) => (
                      <tr key={customer.id} className={clsx("hover:bg-slate-50 transition-colors group", selectedIds.includes(customer.id) && "bg-slate-50/70")}>
                      {isAdmin && (
                        <td className="py-3 px-4 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(customer.id)}
                            onChange={() => handleToggleSelect(customer.id)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                            aria-label={`Chọn khách hàng ${getCustomerFullName(customer)}`}
                          />
                        </td>
                      )}
                      {/* Tên KH */}
                      <td className="py-3 px-4">
                        <div className="min-w-0">
                          <Link href={`/customers/${customer.id}`} className="text-sm font-semibold text-slate-800 hover:text-emerald-600 transition-colors block truncate max-w-[220px]" title={getCustomerFullName(customer)}>
                            {getCustomerFullName(customer)}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {customer.cif_code && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-teal-50 text-[#006b68] border border-teal-100 rounded">
                                CIF: {customer.cif_code}
                              </span>
                            )}
                            {customer.customer_type === 'ENTERPRISE' ? (
                              <>
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#ccedea] text-[#003e3b] border border-teal-200/50 rounded">B2B</span>
                                {customer.customer_segment && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-100 rounded">
                                    {customer.customer_segment}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100 rounded">B2C</span>
                            )}
                            {customer.note && <span className="text-[10px] text-slate-400 italic truncate max-w-[120px]" title={customer.note}>{customer.note}</span>}
                          </div>
                        </div>
                      </td>
                      {/* Sản phẩm */}
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {PRODUCT_MAP.map(prod => {
                            const hasProduct = !!customer[prod.key]
                            const isUpdating = updatingProduct?.customerId === customer.id && updatingProduct?.productKey === prod.key
                            return (
                              <button
                                key={prod.key}
                                title={prod.label}
                                disabled={isUpdating}
                                onClick={() => handleToggleProduct(customer, prod.key, hasProduct)}
                                className={clsx(
                                  "px-1.5 py-0.5 text-[10px] font-semibold border rounded transition-all flex items-center gap-0.5",
                                  hasProduct 
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-600",
                                  isUpdating && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {isUpdating && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                {prod.short}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      {/* Chuyên viên */}
                      <td className="py-3 px-4 text-sm text-slate-600 hidden lg:table-cell">
                        <span className="block truncate max-w-[120px]" title={customer.profiles?.full_name}>
                          {customer.profiles?.full_name || '—'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="py-3 px-4 text-right w-20">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/sales?create=1&type=PRODUCT&customerId=${customer.id}`}
                            className="inline-flex items-center justify-center w-8 h-8 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200 bg-white shadow-sm active:scale-95"
                            title="Ghi nhận bán hàng"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/customers/${customer.id}`}
                            className="inline-flex items-center justify-center w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-slate-200 bg-white shadow-sm active:scale-95"
                            title="Xem chi tiết hồ sơ"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-slate-500">
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
        
        {/* Bulk Actions Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-6 z-50 border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <span className="text-sm font-semibold text-slate-300">
              Đã chọn <strong className="text-emerald-400 font-bold">{selectedIds.length}</strong> khách hàng
            </span>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <select
                value={bulkManagerId}
                onChange={(e) => setBulkManagerId(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500 text-slate-200"
                aria-label="Chọn chuyên viên để phân giao hàng loạt"
              >
                <option value="">Chọn chuyên viên...</option>
                {visibleProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkManagerId || bulkAssigning}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1 shadow-sm"
              >
                {bulkAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                Phân giao
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all"
              >
                Hủy chọn
              </button>
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
