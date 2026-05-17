"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, use } from "react"
import { fetchCustomerById, fetchLoansByCustomer, fetchDepositsByCustomer, fetchInteractionsByCustomer, getCustomerFullName, formatCurrency, updateCustomer } from "@/lib/supabase/api"
import { ArrowLeft, Edit, Save, X, Phone, Mail, MapPin, User as UserIcon, Calendar, FileText, Briefcase, CreditCard, Loader2, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Unpack params since it's a promise in newer Next.js versions
  const resolvedParams = use(params)
  const customerId = resolvedParams.id
  
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [customer, setCustomer] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [interactions, setInteractions] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [cust, lns, deps, ints] = await Promise.all([
        fetchCustomerById(customerId),
        fetchLoansByCustomer(customerId),
        fetchDepositsByCustomer(customerId),
        fetchInteractionsByCustomer(customerId)
      ])
      setCustomer(cust)
      setEditForm(cust)
      setLoans(lns)
      setDeposits(deps)
      setInteractions(ints)
    } catch (err) {
      console.error('Error loading customer details:', err)
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  if (!mounted) return null

  const handleSave = async () => {
    try {
      setSaving(true)
      await updateCustomer(customerId, {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address,
        note: editForm.note
      })
      await loadData()
      setIsEditing(false)
    } catch (err) {
      console.error('Error updating customer:', err)
      alert('Có lỗi xảy ra khi cập nhật thông tin!')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditForm(customer)
    setIsEditing(false)
  }

  const getStatusBadge = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'active':
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Đang hoạt động</span>
      case 'pending':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Chờ duyệt</span>
      case 'closed':
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">Đã đóng</span>
      case 'matured':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">Đã tất toán</span>
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{status || 'N/A'}</span>
    }
  }

  return (
    <DashboardLayout title={loading ? "Đang tải..." : `Chi tiết: ${getCustomerFullName(customer)}`}>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
        
        {/* Navigation Header */}
        <div className="flex items-center gap-4">
          <Link href="/customers" className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-800">Hồ sơ Khách hàng</h1>
            <p className="text-sm text-slate-500">Mã KH: {customerId.substring(0, 8)}...</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-slate-600 font-medium">Đang tải dữ liệu...</span>
          </div>
        ) : !customer ? (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">Không tìm thấy khách hàng</h2>
            <p className="text-slate-500 mt-2">Khách hàng này không tồn tại hoặc đã bị xóa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Customer Profile */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              {/* Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4 shadow-sm border border-emerald-200">
                    {customer.last_name?.charAt(0)}{customer.first_name?.charAt(0)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">{getCustomerFullName(customer)}</h2>
                  <p className="text-sm text-slate-500 mt-1">Cán bộ QL: {customer.profiles?.full_name || 'Chưa phân bổ'}</p>
                  
                  {!isEditing && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-medium w-full justify-center"
                    >
                      <Edit className="w-4 h-4" /> Chỉnh sửa thông tin
                    </button>
                  )}
                </div>
                
                <div className="p-6 flex flex-col gap-4">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Họ & Tên đệm</label>
                        <input 
                          type="text" 
                          value={editForm.last_name || ''} 
                          onChange={e => setEditForm({...editForm, last_name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tên</label>
                        <input 
                          type="text" 
                          value={editForm.first_name || ''} 
                          onChange={e => setEditForm({...editForm, first_name: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Số điện thoại</label>
                        <input 
                          type="text" 
                          value={editForm.phone || ''} 
                          onChange={e => setEditForm({...editForm, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                        <input 
                          type="email" 
                          value={editForm.email || ''} 
                          onChange={e => setEditForm({...editForm, email: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Địa chỉ</label>
                        <textarea 
                          value={editForm.address || ''} 
                          onChange={e => setEditForm({...editForm, address: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
                        <textarea 
                          value={editForm.note || ''} 
                          onChange={e => setEditForm({...editForm, note: e.target.value})}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <X className="w-4 h-4" /> Hủy
                        </button>
                        <button 
                          onClick={handleSave}
                          disabled={saving}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                          Lưu
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Số điện thoại</p>
                          <p className="text-sm font-medium text-slate-800">{customer.phone || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Email</p>
                          <p className="text-sm font-medium text-slate-800">{customer.email || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Địa chỉ</p>
                          <p className="text-sm font-medium text-slate-800">{customer.address || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Ghi chú</p>
                          <p className="text-sm text-slate-700 whitespace-pre-wrap">{customer.note || 'Không có ghi chú'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{loans.length}</p>
                  <p className="text-xs font-medium text-slate-500">Khoản vay</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{deposits.length}</p>
                  <p className="text-xs font-medium text-slate-500">Tiền gửi</p>
                </div>
              </div>

            </div>

            {/* Right Column: Related Data */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Loans Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-500" />
                    Khoản Vay
                  </h3>
                  <Link href={`/loans?customerId=${customerId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    Xem tất cả <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div className="p-0">
                  {loans.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Chưa có khoản vay nào.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {loans.slice(0, 5).map(loan => (
                        <div key={loan.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-semibold text-slate-800">Số TK: {loan.account_number}</p>
                            <p className="text-sm text-slate-500">{loan.loan_type || 'Vay tiêu dùng'} • Đáo hạn: {new Date(loan.due_date).toLocaleDateString('vi-VN')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrency(loan.balance)}</p>
                            <div className="mt-1">{getStatusBadge(loan.status)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Deposits Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-teal-500" />
                    Tiền Gửi
                  </h3>
                </div>
                <div className="p-0">
                  {deposits.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Chưa có khoản tiền gửi nào.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {deposits.slice(0, 5).map(deposit => (
                        <div key={deposit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-semibold text-slate-800">Số TK: {deposit.account_number}</p>
                            <p className="text-sm text-slate-500">{deposit.deposit_type || 'Tiết kiệm thường'} • Lãi suất: {deposit.interest_rate}%</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-800">{formatCurrency(deposit.amount)}</p>
                            <div className="mt-1">{getStatusBadge(deposit.status)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Interactions Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Lịch Sử Tương Tác
                  </h3>
                </div>
                <div className="p-0">
                  {interactions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Chưa có lịch sử tương tác nào.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {interactions.slice(0, 5).map(interaction => (
                        <div key={interaction.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                                {interaction.type}
                              </span>
                              <span className="text-sm font-medium text-slate-800">{interaction.purpose}</span>
                            </div>
                            <span className="text-xs text-slate-500 font-medium">
                              {interaction.interaction_date ? new Date(interaction.interaction_date).toLocaleDateString('vi-VN') : 'N/A'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600">{interaction.notes}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                            <span>Thực hiện bởi: {interaction.profiles?.full_name || 'Hệ thống'}</span>
                            {interaction.result && (
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Kết quả: {interaction.result}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
