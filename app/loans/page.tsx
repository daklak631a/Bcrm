"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, MoreHorizontal, ArrowUpRight, CheckCircle2, Clock, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useMemo, useCallback } from "react"
import { fetchLoans, createLoan, fetchCustomers, formatCurrency, getCustomerFullName } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"

const ITEMS_PER_PAGE = 10

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
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createLoan({
        customer_id: form.get('customer_id') as string,
        account_number: form.get('account_number') as string || `LN${Date.now()}`,
        loan_amount: Number(form.get('loan_amount')),
        balance: Number(form.get('loan_amount')),
        interest_rate: Number(form.get('interest_rate')) || 0,
        start_date: form.get('start_date') as string,
        due_date: form.get('due_date') as string,
        loan_type: form.get('loan_type') as string || 'Vay tiêu dùng',
        status: 'ACTIVE',
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
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{loan.account_number}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">
                            {loan.customers ? getCustomerFullName(loan.customers) : '—'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{loan.loan_type || '—'}</td>
                          <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(Number(loan.loan_amount))}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{formatCurrency(Number(loan.balance))}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{loan.interest_rate}%/năm</td>
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
          <FormField label="Khách hàng" required>
            <FormSelect name="customer_id" required>
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>{getCustomerFullName(c)}</option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="Số tài khoản vay">
            <FormInput name="account_number" placeholder="Để trống sẽ tự sinh" />
          </FormField>
          <FormField label="Loại khoản vay">
            <FormSelect name="loan_type">
              <option value="Vay tiêu dùng">Vay tiêu dùng</option>
              <option value="Vay mua nhà">Vay mua nhà</option>
              <option value="Vay sản xuất kinh doanh">Vay sản xuất kinh doanh</option>
              <option value="Vay mua ô tô">Vay mua ô tô</option>
              <option value="Vay tín chấp">Vay tín chấp</option>
            </FormSelect>
          </FormField>
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
    </DashboardLayout>
  )
}
