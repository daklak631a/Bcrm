"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, MoreHorizontal, ArrowUpRight, CheckCircle2, Clock, Loader2, ChevronLeft, ChevronRight, Check, Building2, User, X } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useMemo, useCallback } from "react"
import { fetchLoans, createLoan, fetchCustomers, formatCurrency, getCustomerFullName } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 10

const ENTERPRISE_LOAN_TYPES = [
  { value: "Vay bổ sung vốn lưu động", label: "Vay ngắn hạn bổ sung vốn lưu động (B2B)" },
  { value: "Vay đầu tư dự án", label: "Vay trung dài hạn đầu tư dự án / TSCĐ (B2B)" },
  { value: "Cấp mới hạn mức tín dụng", label: "Cấp mới hạn mức tín dụng HMTD (B2B)" },
  { value: "Thấu chi tài khoản Doanh nghiệp", label: "Thấu chi tài khoản Doanh nghiệp (B2B)" },
  { value: "Cho vay tài trợ thương mại", label: "Tài trợ thương mại & Bảo lãnh L/C (B2B)" }
]

const INDIVIDUAL_LOAN_TYPES = [
  { value: "Vay tiêu dùng", label: "Vay tiêu dùng mua sắm cá nhân" },
  { value: "Vay mua nhà", label: "Vay mua nhà ở, đất nền trả góp" },
  { value: "Vay sản xuất kinh doanh", label: "Vay sản xuất kinh doanh hộ cá thể" },
  { value: "Vay tín chấp", label: "Vay tín chấp tiêu dùng qua lương" },
  { value: "Vay mua ô tô", label: "Vay mua ô tô tiêu dùng / kinh doanh" }
]

export default function LoansPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loans, setLoans] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formLoading, setFormLoading] = useState(false)

  // Customer Search & Quick Add State
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [customerSearch, setCustomerSearch] = useState("")
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false)
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [customerType, setCustomerType] = useState("INDIVIDUAL")
  const [preFilledSearch, setPreFilledSearch] = useState("")

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const qText = customerSearch.toLowerCase().trim()
    const qPhone = customerSearch.replace(/\D/g, '')

    return customers.filter(c => {
      const nameMatch = getCustomerFullName(c).toLowerCase().includes(qText)
      if (nameMatch) return true

      if (qPhone) {
        const cPhoneNormalized = c.phone ? c.phone.replace(/\D/g, '') : ''
        return cPhoneNormalized.includes(qPhone)
      }
      return false
    })
  }, [customers, customerSearch])

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId)
  }, [customers, selectedCustomerId])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [loansData, customersData] = await Promise.all([fetchLoans(), fetchCustomers()])
      setLoans(loansData)
      setCustomers(customersData)
    } catch (err: any) {
      console.error('Error loading loans:', err)
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  const filteredLoans = useMemo(() => {
    if (!searchQuery.trim()) return loans
    const q = searchQuery.toLowerCase().trim()
    return loans.filter((l: any) => {
      const customerName = l.customers ? getCustomerFullName(l.customers) : ''
      return l.account_number?.toLowerCase().includes(q) ||
        customerName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    })
  }, [loans, searchQuery])

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / ITEMS_PER_PAGE))
  const paginatedLoans = filteredLoans.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  // Stats
  const activeLoans = loans.filter((l: any) => l.status === 'ACTIVE')
  const pendingLoans = loans.filter((l: any) => l.status === 'PENDING')
  const totalBalance = activeLoans.reduce((sum: number, l: any) => sum + Number(l.balance || 0), 0)

  if (!mounted) return null

  const handleAddLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      toast.error('Vui lòng chọn khách hàng')
      return
    }
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      const isEnterprise = selectedCustomer?.customer_type === 'ENTERPRISE'
      const loanType = form.get('loan_type') as string || 'Vay tiêu dùng'
      let termType = 'SHORT_TERM'
      if (loanType.includes('trung dài hạn') || loanType.includes('Trung dài hạn')) {
        termType = 'MEDIUM_LONG_TERM'
      }

      await createLoan({
        customer_id: selectedCustomerId,
        account_number: form.get('account_number') as string || `LN${Date.now()}`,
        loan_amount: Number(form.get('loan_amount')),
        balance: Number(form.get('loan_amount')),
        interest_rate: Number(form.get('interest_rate')) || 0,
        start_date: form.get('start_date') as string,
        due_date: form.get('due_date') as string,
        loan_type: loanType,
        status: 'ACTIVE',
        term_type: termType,
        ...(isEnterprise ? {
          business_sector: form.get('business_sector') as string || '',
          disbursement_purpose: form.get('disbursement_purpose') as string || '',
          collateral_assets: form.get('collateral_assets') as string || '',
          credit_limit: Number(form.get('credit_limit')) || 0,
          loan_method: form.get('loan_method') as string || '',
        } : {})
      })
      toast.success('Tạo khoản vay thành công!')
      setShowAddModal(false)
      loadData()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setQuickAddLoading(true)
      const { createCustomer } = await import('@/lib/supabase/api')
      const isEnt = customerType === 'ENTERPRISE'
      const bName = (form.get('business_name') as string || '').trim()
      const repName = (form.get('representative_name') as string || '').trim()
      const fName = isEnt ? bName : (form.get('full_name') as string || '').trim()
      const cifCode = (form.get('cif_code') as string || '').trim() || null

      const newCustomer = await createCustomer({
        customer_type: customerType,
        cif_code: cifCode,
        full_name: fName,
        business_name: isEnt ? bName : '',
        tax_code: isEnt ? (form.get('tax_code') as string || '') : '',
        representative_name: isEnt ? repName : '',
        phone: form.get('phone') as string || '',
        assigned_manager_id: user!.id,
      })
      toast.success('Thêm khách hàng thành công!')
      setCustomers(prev => [newCustomer, ...prev])
      setSelectedCustomerId(newCustomer.id)
      setCustomerSearch(getCustomerFullName(newCustomer))
      setShowQuickAddCustomer(false)
    } catch (err: any) {
      toast.error('Lỗi thêm KH: ' + err.message)
    } finally {
      setQuickAddLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { label: 'Đang trả nợ', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> }
      case 'PENDING': return { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3 h-3" /> }
      case 'CLOSED': return { label: 'Đã tất toán', color: 'bg-slate-100 text-slate-700', icon: null }
      case 'DEFAULTED': return { label: 'Nợ xấu', color: 'bg-rose-100 text-rose-700', icon: null }
      default: return { label: status, color: 'bg-slate-100 text-slate-700', icon: null }
    }
  }

  return (
    <DashboardLayout title="Quản Lý Khoản Vay">
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng Dư Nợ Quản Lý</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{formatCurrency(totalBalance)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Hồ Sơ Chờ Duyệt</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{pendingLoans.length} <span className="text-lg font-medium text-slate-500">Hồ Sơ</span></h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Khoản Vay Đang Hoạt Động</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{activeLoans.length} <span className="text-lg font-medium text-slate-500">Hồ Sơ</span></h3>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm theo số HĐ, khách hàng..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none" />
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Tạo Khoản Vay
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Số TK</th>
                      <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                      <th className="py-3 px-4 font-semibold">Loại Vay</th>
                      <th className="py-3 px-4 font-semibold">Số Tiền Vay</th>
                      <th className="py-3 px-4 font-semibold">Dư Nợ</th>
                      <th className="py-3 px-4 font-semibold">Lãi Suất</th>
                      <th className="py-3 px-4 font-semibold">Ngày Vay</th>
                      <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLoans.map((loan: any) => {
                      const status = getStatusDisplay(loan.status)
                      const isEnterprise = loan.customers?.customer_type === 'ENTERPRISE'
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{loan.account_number}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">
                            <div>{loan.customers ? getCustomerFullName(loan.customers) : '—'}</div>
                            {isEnterprise && (
                              <div className="text-[11px] text-emerald-600 font-normal mt-0.5">
                                Doanh nghiệp {loan.customers.representative_name ? `(ĐD: ${loan.customers.representative_name})` : ''}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            <div className="font-medium text-slate-700">{loan.loan_type || '—'}</div>
                            {loan.business_sector && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Lĩnh vực: <span className="text-slate-700">{loan.business_sector}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(Number(loan.loan_amount))}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">
                            <div className="font-semibold">{formatCurrency(Number(loan.balance))}</div>
                            {Number(loan.credit_limit) > 0 && (
                              <div className="text-[11px] text-slate-500 mt-0.5 font-normal">
                                Hạn mức: {formatCurrency(Number(loan.credit_limit))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            <div>{loan.interest_rate}%/năm</div>
                            {loan.collateral_assets && (
                              <div className="text-[11px] text-amber-600 mt-0.5 font-normal" title={loan.collateral_assets}>
                                TSĐB: {loan.collateral_assets.length > 20 ? `${loan.collateral_assets.slice(0, 20)}...` : loan.collateral_assets}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{new Date(loan.start_date).toLocaleDateString('vi-VN')}</td>
                          <td className="py-3 px-4">
                            <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1", status.color)}>
                              {status.icon} {status.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredLoans.length === 0 && (
                      <tr><td colSpan={8} className="py-12 text-center text-slate-500">Chưa có khoản vay nào. Bấm "Tạo Khoản Vay" để bắt đầu.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                <span>{filteredLoans.length > 0 ? `Hiển thị ${(currentPage-1)*ITEMS_PER_PAGE+1} - ${Math.min(currentPage*ITEMS_PER_PAGE, filteredLoans.length)} / ${filteredLoans.length}` : "Không có khoản vay"}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({length: Math.min(totalPages, 5)}, (_,i) => i+1).map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)} className={clsx("px-3 py-1 border rounded text-sm font-medium", p===currentPage ? "bg-emerald-600 text-white border-emerald-600" : "bg-white hover:bg-slate-50")}>{p}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Loan Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tạo Khoản Vay Mới">
        <form onSubmit={handleAddLoan} className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <span>Khách hàng <span className="text-rose-500">*</span></span>
              {selectedCustomer && (
                <span className={clsx(
                  "text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border",
                  selectedCustomer.customer_type === 'ENTERPRISE' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-sky-50 text-sky-700 border-sky-200"
                )}>
                  {selectedCustomer.customer_type === 'ENTERPRISE' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {selectedCustomer.customer_type === 'ENTERPRISE' ? "Doanh nghiệp (B2B)" : "Cá nhân"}
                </span>
              )}
            </label>
            
            <div className="relative">
              {/* Left Search Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
              
              {/* Main Search Input */}
              <input 
                type="text" 
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                  if (selectedCustomerId) {
                    setSelectedCustomerId("")
                  }
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Tìm kiếm theo tên hoặc SĐT..." 
                className={clsx(
                  "w-full pl-9 pr-28 py-2 bg-white border rounded-lg text-sm outline-none transition-all",
                  selectedCustomerId 
                    ? "border-emerald-500 ring-2 ring-emerald-500/10 font-medium text-slate-800" 
                    : "border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                )}
              />

              {/* Right Action Icons Group */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSearch("")
                      setSelectedCustomerId("")
                      setShowCustomerDropdown(false)
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerDropdown(false)
                    const query = customerSearch.trim()
                    if (query) {
                      const lowerQ = query.toLowerCase()
                      const isEnt = lowerQ.includes("công ty") || lowerQ.includes("tnhh") || lowerQ.includes("doanh nghiệp") || lowerQ.includes("b2b") || lowerQ.includes("coop") || lowerQ.includes("group") || lowerQ.includes("cp")
                      if (isEnt) {
                        setCustomerType("ENTERPRISE")
                      } else {
                        setCustomerType("INDIVIDUAL")
                      }
                      setPreFilledSearch(query)
                    } else {
                      setPreFilledSearch("")
                    }
                    setShowQuickAddCustomer(true)
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/50 rounded-md transition-colors flex items-center gap-1 shadow-sm"
                  title="Thêm nhanh khách hàng"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm nhanh
                </button>
              </div>

              {/* Dropdown Menu */}
              {showCustomerDropdown && (
                <div className="absolute z-50 w-full mt-1.5 top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => {
                      const isEnt = c.customer_type === 'ENTERPRISE'
                      const isSel = selectedCustomerId === c.id
                      return (
                        <div 
                          key={c.id} 
                          className={clsx(
                            "px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-all duration-100",
                            isSel 
                              ? "bg-emerald-50 text-emerald-800 font-medium" 
                              : "hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          )}
                          onClick={() => {
                            setSelectedCustomerId(c.id)
                            setCustomerSearch(getCustomerFullName(c))
                            setShowCustomerDropdown(false)
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={clsx(
                              "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                              isEnt 
                                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                                : "bg-sky-50 border-sky-100 text-sky-600"
                            )}>
                              {isEnt ? <Building2 className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="font-semibold text-slate-800 text-[13px]">
                                {getCustomerFullName(c)}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-slate-500 font-normal">
                                {c.phone && <span>{c.phone}</span>}
                                {c.phone && c.profiles?.full_name && <span className="text-slate-300">•</span>}
                                {c.profiles?.full_name && (
                                  <span>QL: {c.profiles.full_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase",
                              isEnt ? "bg-emerald-100/70 text-emerald-800" : "bg-sky-100/70 text-sky-800"
                            )}>
                              {isEnt ? "B2B" : "Cá nhân"}
                            </span>
                            {isSel && <Check className="w-4 h-4 text-emerald-600" />}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="px-4 py-5 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                      <p className="font-medium text-slate-600">Không tìm thấy khách hàng "{customerSearch}"</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCustomerDropdown(false)
                          const query = customerSearch.trim()
                          if (query) {
                            const lowerQ = query.toLowerCase()
                            const isEnt = lowerQ.includes("công ty") || lowerQ.includes("tnhh") || lowerQ.includes("doanh nghiệp") || lowerQ.includes("b2b") || lowerQ.includes("coop") || lowerQ.includes("group") || lowerQ.includes("cp")
                            if (isEnt) {
                              setCustomerType("ENTERPRISE")
                            } else {
                              setCustomerType("INDIVIDUAL")
                            }
                            setPreFilledSearch(query)
                          }
                          setShowQuickAddCustomer(true)
                        }}
                        className="mt-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Thêm nhanh khách hàng này
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Overlay to close dropdown */}
            {showCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>}
          </div>

          <FormField label="Số tài khoản vay">
            <FormInput name="account_number" placeholder="Để trống sẽ tự sinh" />
          </FormField>
          
          <FormField label="Loại khoản vay" required>
            <FormSelect name="loan_type" required disabled={!selectedCustomerId}>
              {!selectedCustomerId ? (
                <option value="">Vui lòng chọn khách hàng trước...</option>
              ) : selectedCustomer?.customer_type === 'ENTERPRISE' ? (
                <>
                  <option value="">-- Chọn gói vay doanh nghiệp (B2B) --</option>
                  {ENTERPRISE_LOAN_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </>
              ) : (
                <>
                  <option value="">-- Chọn gói vay cá nhân --</option>
                  {INDIVIDUAL_LOAN_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </>
              )}
            </FormSelect>
          </FormField>

          {/* Conditional B2B Corporate fields when ENTERPRISE is selected */}
          {selectedCustomer?.customer_type === 'ENTERPRISE' && (
            <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-teal-50/20 rounded-xl border border-emerald-100 shadow-sm space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 pb-1 border-b border-emerald-100/50">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Thông Tin Doanh Nghiệp (B2B)</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Lĩnh vực kinh doanh">
                  <FormInput name="business_sector" placeholder="VD: Sản xuất, Thương mại..." />
                </FormField>
                <FormField label="Phương thức cho vay">
                  <FormInput name="loan_method" placeholder="VD: Hạn mức, Thấu chi..." />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Hạn mức cấp (VNĐ)">
                  <FormInput name="credit_limit" type="number" placeholder="VD: 5000000000" />
                </FormField>
                <FormField label="Mục đích sử dụng vốn">
                  <FormInput name="disbursement_purpose" placeholder="VD: Bổ sung vốn lưu động..." />
                </FormField>
              </div>

              <FormField label="Tài sản bảo đảm">
                <FormInput name="collateral_assets" placeholder="VD: Bất động sản, Máy móc..." />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số tiền vay (VNĐ)" required>
              <FormInput name="loan_amount" type="number" required placeholder="500000000" />
            </FormField>
            <FormField label="Lãi suất (%/năm)">
              <FormInput name="interest_rate" type="number" step="0.1" placeholder="7.5" />
            </FormField>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ngày giải ngân" required>
              <FormInput name="start_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </FormField>
            <FormField label="Ngày đáo hạn" required>
              <FormInput name="due_date" type="date" required />
            </FormField>
          </div>
          
          <SubmitButton loading={formLoading}>Tạo Khoản Vay</SubmitButton>
        </form>
      </Modal>

      {/* Quick Add Customer Modal */}
      <Modal isOpen={showQuickAddCustomer} onClose={() => setShowQuickAddCustomer(false)} title="Thêm Nhanh Khách Hàng">
        <form onSubmit={handleQuickAddCustomer} className="space-y-4">
          <FormField label="Loại Khách Hàng">
            <FormSelect value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
              <option value="INDIVIDUAL">Cá Nhân</option>
              <option value="ENTERPRISE">Doanh Nghiệp (B2B)</option>
            </FormSelect>
          </FormField>

          {customerType === 'ENTERPRISE' ? (
            <>
              <FormField label="Tên Doanh Nghiệp" required>
                <FormInput name="business_name" required defaultValue={preFilledSearch} placeholder="VD: Công ty TNHH ABC" />
              </FormField>
              <FormField label="Mã Số Thuế">
                <FormInput name="tax_code" placeholder="Mã số thuế" />
              </FormField>
              <FormField label="Người đại diện" required>
                <FormInput name="representative_name" required placeholder="Họ và tên người đại diện" />
              </FormField>
            </>
          ) : (
            <FormField label="Tên KH" required>
              <FormInput name="full_name" required defaultValue={preFilledSearch} placeholder="Nguyễn Văn An" />
            </FormField>
          )}

          <FormField label="Mã CIF (Tùy chọn)">
            <FormInput name="cif_code" placeholder="Nhập mã CIF nếu có" />
          </FormField>

          <FormField label="Số điện thoại" required>
            <FormInput name="phone" required placeholder="09xxxxxxx" />
          </FormField>
          
          <SubmitButton loading={quickAddLoading}>Thêm Khách Hàng</SubmitButton>
        </form>
      </Modal>
    </DashboardLayout>
  )
}
