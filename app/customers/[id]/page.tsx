"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, use } from "react"
import { fetchCustomerById, fetchInteractionsByCustomer, fetchProfiles, fetchSalesRecordsByCustomer, getCustomerFullName, formatCurrency, updateCustomer } from "@/lib/supabase/api"
import { ArrowLeft, Edit, Save, X, Phone, Mail, MapPin, Calendar, FileText, Briefcase, CreditCard, ShoppingCart, Loader2, ArrowRight, Plus } from "lucide-react"
import Link from "next/link"
import { formatMetricValue, getRecordMetricValue, getRecordUnitLabel } from "@/lib/product-metrics"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import { canAccessOwner } from "@/lib/access-control"

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuthStore()
  // Unpack params since it's a promise in newer Next.js versions
  const resolvedParams = use(params)
  const customerId = resolvedParams.id
  
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [customer, setCustomer] = useState<any>(null)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [interactions, setInteractions] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [cust, profiles] = await Promise.all([
        fetchCustomerById(customerId),
        fetchProfiles(),
      ])
      if (!cust || !canAccessOwner(cust.assigned_manager_id, profiles, user)) {
        setCustomer(null)
        setEditForm({})
        setNotesDraft("")
        setSalesRecords([])
        setInteractions([])
        return
      }
      const [sales, ints] = await Promise.all([
        fetchSalesRecordsByCustomer(customerId),
        fetchInteractionsByCustomer(customerId)
      ])
      setCustomer(cust)
      setEditForm(cust)
      setNotesDraft(cust?.note || "")
      setSalesRecords(sales)
      setInteractions(ints)
    } catch (err) {
      console.error('Error loading customer details:', err)
    } finally {
      setLoading(false)
    }
  }, [customerId, user])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  if (!mounted) return null

  const handleSave = async () => {
    try {
      setSaving(true)
      const isEnt = editForm.customer_type === 'ENTERPRISE'
      await updateCustomer(customerId, {
        customer_type: editForm.customer_type,
        business_name: isEnt ? editForm.business_name : '',
        tax_code: isEnt ? editForm.tax_code : '',
        representative_name: isEnt ? editForm.representative_name : '',
        full_name: isEnt ? editForm.business_name : editForm.full_name,
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

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true)
      await updateCustomer(customerId, {
        note: notesDraft
      })
      toast.success("Đã cập nhật ghi chú khách hàng thành công!")
      setCustomer((prev: any) => prev ? { ...prev, note: notesDraft } : null)
    } catch (err) {
      console.error('Error saving customer notes:', err)
      toast.error('Có lỗi xảy ra khi cập nhật ghi chú!')
    } finally {
      setSavingNotes(false)
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
        return <span className="px-2 py-1 bg-teal-50 text-[#006b68] border border-teal-200/50 rounded-full text-xs font-medium">Đã tất toán</span>
      case 'completed':
        return <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-medium">Thành công</span>
      case 'interested':
        return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">Quan tâm</span>
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{status || 'N/A'}</span>
    }
  }

  const getSaleMeta = (sourceType: string) => {
    switch (sourceType) {
      case 'LOAN':
        return { label: 'Khoản vay', icon: Briefcase, badge: 'bg-teal-100 text-teal-700', iconWrap: 'bg-teal-50 text-teal-600' }
      case 'DEPOSIT':
        return { label: 'Tiền gửi', icon: CreditCard, badge: 'bg-emerald-100 text-emerald-700', iconWrap: 'bg-emerald-50 text-emerald-600' }
      default:
        return { label: 'Sản phẩm', icon: ShoppingCart, badge: 'bg-amber-100 text-amber-700', iconWrap: 'bg-amber-50 text-amber-600' }
    }
  }

  const loanSalesCount = salesRecords.filter(record => record.source_type === 'LOAN').length
  const depositSalesCount = salesRecords.filter(record => record.source_type === 'DEPOSIT').length
  const productSalesCount = salesRecords.filter(record => record.source_type === 'PRODUCT').length

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
                    {customer.customer_type === 'ENTERPRISE'
                      ? (customer.business_name?.substring(0, 2).toUpperCase() || 'DN')
                      : (customer.full_name?.split(' ').pop()?.substring(0, 2).toUpperCase() || 'KH')}
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
                      {editForm.customer_type === 'ENTERPRISE' ? (
                        <>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Tên Doanh Nghiệp</label>
                            <input 
                              type="text" 
                              value={editForm.business_name || ''} 
                              onChange={e => setEditForm({...editForm, business_name: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Mã Số Thuế</label>
                            <input 
                              type="text" 
                              value={editForm.tax_code || ''} 
                              onChange={e => setEditForm({...editForm, tax_code: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1">Người đại diện</label>
                            <input 
                              type="text" 
                              value={editForm.representative_name || ''} 
                              onChange={e => setEditForm({...editForm, representative_name: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                            />
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">Họ và Tên</label>
                          <input 
                            type="text" 
                            value={editForm.full_name || ''} 
                            onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" 
                          />
                        </div>
                      )}
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
                    </>
                  )}
                </div>
              </div>

              {/* Dedicated Notes Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    Ghi chú khách hàng
                  </h3>
                  {notesDraft !== (customer?.note || '') && (
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
                    >
                      {savingNotes ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Lưu nhanh
                    </button>
                  )}
                </div>
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Ghi chú thêm về khách hàng (lịch sử cuộc gọi, thói quen giao dịch, nhu cầu vốn...)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/30 focus:bg-white transition-all resize-y min-h-[100px] outline-none"
                  rows={4}
                />
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#006b68] border border-teal-100 flex items-center justify-center mb-2">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{loanSalesCount}</p>
                  <p className="text-xs font-medium text-slate-500">Khoản vay</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center mb-2">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{depositSalesCount}</p>
                  <p className="text-xs font-medium text-slate-500">Tiền gửi</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col items-center">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{productSalesCount}</p>
                  <p className="text-xs font-medium text-slate-500">SP Dịch vụ</p>
                </div>
              </div>

            </div>

            {/* Right Column: Related Data */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Sales Section */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-amber-500" />
                    Bán Hàng
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                    <Link
                      href={`/sales?create=1&type=LOAN&customerId=${customerId}`}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Cấp vay
                    </Link>
                    <Link
                      href={`/sales?create=1&type=DEPOSIT&customerId=${customerId}`}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Nhận tiền gửi
                    </Link>
                    <Link
                      href={`/sales?create=1&type=PRODUCT&customerId=${customerId}`}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-xs font-bold shadow-sm"
                    >
                      <Plus className="w-3 h-3" /> Bán hàng
                    </Link>
                    <div className="hidden sm:block h-5 w-px bg-slate-200 mx-1" />
                    <Link href={`/sales?customerId=${customerId}`} className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                      Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="p-0">
                  {salesRecords.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Chưa có giao dịch bán hàng nào.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {salesRecords.slice(0, 8).map(sale => {
                        const saleMeta = getSaleMeta(sale.source_type)
                        const SaleIcon = saleMeta.icon
                        return (
                          <div key={sale.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${saleMeta.iconWrap}`}>
                                <SaleIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-800">{sale.title || saleMeta.label}</p>
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${saleMeta.badge}`}>
                                    {saleMeta.label}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {sale.category}
                                  {sale.account_number ? ` • Số TK: ${sale.account_number}` : ''}
                                </p>
                                {sale.note && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{sale.note}</p>}
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1 shrink-0">
                              <p className="font-bold text-slate-800">
                                {sale.source_type === 'PRODUCT'
                                  ? formatMetricValue(getRecordMetricValue(sale), getRecordUnitLabel(sale))
                                  : formatCurrency(Number(sale.amount || 0))}
                              </p>
                              <div className="mt-1">{getStatusBadge(sale.status)}</div>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(sale.sale_date).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          </div>
                        )
                      })}
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
