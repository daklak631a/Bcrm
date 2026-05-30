"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, PiggyBank, TrendingUp, CalendarClock, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { Suspense, useEffect, useState, useMemo, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { fetchDeposits, createDeposit, fetchCustomers, formatCurrency, getCustomerFullName, createCustomer } from "@/lib/supabase/api"
import { Modal, FormField, FormInput, FormSelect, SubmitButton } from "@/components/ui/modal"
import { toast } from "sonner"
import { Check } from "lucide-react"

const ITEMS_PER_PAGE = 10

function DepositsPageContent() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const customerIdParam = searchParams.get('customerId')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deposits, setDeposits] = useState<any[]>([])
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

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers
    const q = customerSearch.toLowerCase()
    return customers.filter(c => getCustomerFullName(c).toLowerCase().includes(q))
  }, [customers, customerSearch])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [depositsData, customersData] = await Promise.all([fetchDeposits(), fetchCustomers()])
      setDeposits(depositsData)
      setCustomers(customersData)
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  useEffect(() => {
    if (!customerIdParam || customers.length === 0) return
    const customer = customers.find(c => c.id === customerIdParam)
    if (!customer) return
    setSelectedCustomerId(customer.id)
    setCustomerSearch(getCustomerFullName(customer))
    setSearchQuery(getCustomerFullName(customer))
  }, [customerIdParam, customers])

  const filteredDeposits = useMemo(() => {
    if (!searchQuery.trim()) return deposits
    const q = searchQuery.toLowerCase().trim()
    return deposits.filter((d: any) => {
      const name = d.customers ? getCustomerFullName(d.customers) : ''
      return d.account_number?.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    })
  }, [deposits, searchQuery])

  useEffect(() => { setCurrentPage(1) }, [searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredDeposits.length / ITEMS_PER_PAGE))
  const paginatedDeposits = filteredDeposits.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE)
  const activeDeposits = deposits.filter((d: any) => d.status === 'ACTIVE')
  const totalAmount = activeDeposits.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0)
  const pendingDeposits = deposits.filter((d: any) => d.status === 'PENDING')
  const createDepositHref = customerIdParam
    ? `/sales?create=1&type=DEPOSIT&customerId=${customerIdParam}`
    : '/sales?create=1&type=DEPOSIT'

  if (!mounted) return null

  const handleAddDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      toast.error('Vui lòng chọn khách hàng')
      return
    }
    const form = new FormData(e.currentTarget)
    try {
      setFormLoading(true)
      await createDeposit({
        customer_id: selectedCustomerId,
        account_number: form.get('account_number') as string || `DP${Date.now()}`,
        amount: Number(form.get('amount')),
        start_date: form.get('start_date') as string,
        maturity_date: form.get('maturity_date') as string,
        deposit_type: form.get('deposit_type') as string || 'Tiết kiệm thường',
        status: 'ACTIVE',
      })
      toast.success('Mở sổ tiền gửi thành công!')
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
      case 'ACTIVE': return { label: 'Đang gửi', color: 'bg-emerald-100 text-emerald-700' }
      case 'PENDING': return { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700' }
      case 'MATURED': return { label: 'Đến hạn', color: 'bg-teal-50 text-[#006b68] border border-teal-200/50' }
      case 'CLOSED': return { label: 'Đã tất toán', color: 'bg-slate-100 text-slate-700' }
      default: return { label: status, color: 'bg-slate-100 text-slate-700' }
    }
  }

  const handleQuickAddCustomer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    try {
      setQuickAddLoading(true)
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

  return (
    <DashboardLayout title="Theo Dõi Tiền Gửi">
      <div className="flex flex-col gap-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4"><PiggyBank className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng Vốn Huy Động</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{formatCurrency(totalAmount)}</h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-[#006b68] border border-teal-100 flex items-center justify-center mb-4"><TrendingUp className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">Số Lượng Giao Dịch</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{deposits.length} <span className="text-lg font-medium text-slate-500">GD</span></h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-4"><CalendarClock className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-slate-500 mb-1">Chờ Phát Hành Sổ</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{pendingDeposits.length} <span className="text-lg font-medium text-slate-500">Khách</span></h3>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Tìm kiếm theo số TK, khách hàng..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 w-full outline-none" />
          </div>
          <Link href={createDepositHref} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm">
            <Plus className="w-4 h-4" /> Ghi nhận tại Bảng Bán Hàng
          </Link>
        </div>

        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3 text-sm">
          Giao dịch huy động mới nên được ghi nhận tại <Link href={createDepositHref} className="font-semibold underline underline-offset-2">Bảng Bán Hàng</Link>. Trang này tiếp tục dùng để theo dõi danh sách sổ và tình trạng hiện tại.
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /><span className="ml-2 text-slate-500">Đang tải...</span></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="text-sm text-slate-600 font-medium">
                      <th className="py-3 px-4 font-semibold">Số TK</th>
                      <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                      <th className="py-3 px-4 font-semibold">Loại</th>
                      <th className="py-3 px-4 font-semibold">Số Tiền</th>
                      <th className="py-3 px-4 font-semibold">Ngày Giao Dịch</th>
                      <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedDeposits.map((deposit: any) => {
                      const status = getStatusDisplay(deposit.status)
                      return (
                        <tr key={deposit.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{deposit.account_number}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">{deposit.customers ? getCustomerFullName(deposit.customers) : '—'}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{deposit.deposit_type || '—'}</td>
                          <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(Number(deposit.amount))}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            <div>{new Date(deposit.start_date).toLocaleDateString('vi-VN')}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">Đáo hạn: {new Date(deposit.maturity_date).toLocaleDateString('vi-VN')}</div>
                          </td>
                          <td className="py-3 px-4"><span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium", status.color)}>{status.label}</span></td>
                        </tr>
                      )
                    })}
                    {filteredDeposits.length === 0 && (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500">Chưa có khoản gửi nào. Hãy ghi nhận giao dịch mới từ Bảng Bán Hàng.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-500">
                <span>{filteredDeposits.length > 0 ? `Hiển thị ${(currentPage-1)*ITEMS_PER_PAGE+1} - ${Math.min(currentPage*ITEMS_PER_PAGE, filteredDeposits.length)} / ${filteredDeposits.length}` : "Không có dữ liệu"}</span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
                    {Array.from({length: Math.min(totalPages,5)},(_,i)=>i+1).map(p => (
                      <button key={p} onClick={() => setCurrentPage(p)} className={clsx("px-3 py-1 border rounded text-sm font-medium", p===currentPage?"bg-emerald-600 text-white border-emerald-600":"bg-white hover:bg-slate-50")}>{p}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1.5 border rounded bg-white hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Deposit Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Mở Sổ Tiền Gửi Mới">
        <form onSubmit={handleAddDeposit} className="space-y-4">
          <div className="space-y-1 relative">
            <label className="text-sm font-medium text-slate-700">Khách hàng <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input 
                type="text" 
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                  if (selectedCustomerId) setSelectedCustomerId("")
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Tìm kiếm tên hoặc SĐT..." 
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <div 
                        key={c.id} 
                        className={clsx("px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 flex items-center justify-between", selectedCustomerId === c.id && "bg-emerald-50 text-emerald-700")}
                        onClick={() => {
                          setSelectedCustomerId(c.id)
                          setCustomerSearch(getCustomerFullName(c))
                          setShowCustomerDropdown(false)
                        }}
                      >
                        <span>{getCustomerFullName(c)} {c.phone ? `- ${c.phone}` : ''}</span>
                        {selectedCustomerId === c.id && <Check className="w-4 h-4" />}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                      <p>Không tìm thấy khách hàng.</p>
                      <button 
                        type="button" 
                        onClick={() => {
                          setShowCustomerDropdown(false)
                          setShowQuickAddCustomer(true)
                        }}
                        className="text-emerald-600 font-medium hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Thêm nhanh KH mới
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Overlay to close dropdown */}
            {showCustomerDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDropdown(false)}></div>}
          </div>
          <FormField label="Số tài khoản">
            <FormInput name="account_number" placeholder="Để trống sẽ tự sinh" />
          </FormField>
          <FormField label="Loại tiền gửi">
            <FormSelect name="deposit_type">
              <option value="Tiết kiệm thường">Tiết kiệm thường</option>
              <option value="Tiết kiệm có kỳ hạn">Tiết kiệm có kỳ hạn</option>
              <option value="Tiết kiệm không kỳ hạn">Tiết kiệm không kỳ hạn</option>
              <option value="Tiền gửi thanh toán">Tiền gửi thanh toán</option>
            </FormSelect>
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Số tiền gửi (VNĐ)" required>
              <FormInput name="amount" type="number" required placeholder="100000000" />
            </FormField>
            <FormField label="Ngày gửi" required>
              <FormInput name="start_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Ngày đáo hạn" required>
              <FormInput name="maturity_date" type="date" required />
            </FormField>
            <div></div>
          </div>
          <SubmitButton loading={formLoading}>Mở Sổ Tiền Gửi</SubmitButton>
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
            <FormField label="Tên KH" required>
              <FormInput name="full_name" required placeholder="Nguyễn Văn An" />
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

export default function DepositsPage() {
  return (
    <Suspense fallback={null}>
      <DepositsPageContent />
    </Suspense>
  )
}
