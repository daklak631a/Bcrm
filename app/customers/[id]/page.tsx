"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, use } from "react"
import { fetchCustomerById, fetchInteractionsByCustomer, fetchProfiles, fetchSalesRecordsByCustomer, getCustomerFullName, formatCurrency, updateCustomer, fetchProducts } from "@/lib/supabase/api"
import { ArrowLeft, Edit, Save, X, Phone, Mail, MapPin, Calendar, FileText, Briefcase, CreditCard, ShoppingCart, Loader2, ArrowRight, Plus, Sparkles, Network } from "lucide-react"
import Link from "next/link"
import { formatMetricValue, getRecordMetricValue, getRecordUnitLabel } from "@/lib/product-metrics"
import { toast } from "sonner"
import { useAuthStore } from "@/store/useAuthStore"
import { canAccessOwner } from "@/lib/access-control"
import { getErrorMessage } from "@/lib/errors"
import { logger } from "@/lib/logger"
import CustomerTimeline from "@/components/customer/CustomerTimeline"
import { getUnexploitedProducts } from "@/lib/customers/cross-sell-suggestions"
import clsx from "clsx"

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
  const [products, setProducts] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [interactionModalOpen, setInteractionModalOpen] = useState(false)
  
  const [notesDraft, setNotesDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [cust, profiles] = await Promise.all([
        fetchCustomerById(customerId),
        fetchProfiles(),
      ]) as [any, any[]]
      if (!cust || !canAccessOwner(cust.assigned_manager_id, profiles, user)) {
        setCustomer(null)
        setEditForm({})
        setNotesDraft("")
        setSalesRecords([])
        setInteractions([])
        return
      }
      const [sales, ints, allProducts] = await Promise.all([
        fetchSalesRecordsByCustomer(customerId),
        fetchInteractionsByCustomer(customerId),
        fetchProducts()
      ])
      setCustomer(cust)
      setEditForm(cust)
      setNotesDraft(cust?.note || "")
      setSalesRecords(sales)
      setInteractions(ints)
      setProducts(allProducts)
    } catch (err) {
      logger.error("[Customer Detail] Failed to load customer data", { error: getErrorMessage(err) })
      toast.error("Không thể tải thông tin khách hàng. Vui lòng thử lại.")
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
        note: editForm.note,
        customer_segment: isEnt ? (editForm.customer_segment || 'SME') : '',
      })
      await loadData()
      setIsEditing(false)
    } catch (err) {
      logger.error("[Customer Detail] Failed to update customer", { error: getErrorMessage(err) })
      toast.error('Có lỗi xảy ra khi cập nhật thông tin!')
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
      logger.error("[Customer Detail] Failed to save notes", { error: getErrorMessage(err) })
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
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold">Đang hoạt động</span>
      case 'pending':
        return <span className="px-2 py-0.5 bg-gold-100 text-gold-800 rounded-md text-[11px] font-semibold">Chờ duyệt</span>
      case 'closed':
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">Đã đóng</span>
      case 'matured':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[11px] font-semibold">Đã tất toán</span>
      case 'completed':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold">Thành công</span>
      case 'interested':
        return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold">Quan tâm</span>
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">{status || 'N/A'}</span>
    }
  }

  const getSaleMeta = (sourceType: string) => {
    switch (sourceType) {
      case 'LOAN':
        return { label: 'Khoản vay', icon: Briefcase, badge: 'bg-emerald-100 text-emerald-800', iconWrap: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' }
      case 'DEPOSIT':
        return { label: 'Tiền gửi', icon: CreditCard, badge: 'bg-emerald-50 text-emerald-700', iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100' }
      default:
        return { label: 'Sản phẩm', icon: ShoppingCart, badge: 'bg-gold-100 text-gold-800', iconWrap: 'bg-gold-50 text-gold-700 ring-1 ring-gold-100' }
    }
  }

  const salesActions = [
    { href: `/sales?create=1&type=LOAN&customerId=${customerId}`, label: 'Cấp vay', icon: Briefcase, tone: 'emerald' as const },
    { href: `/sales?create=1&type=DEPOSIT&customerId=${customerId}`, label: 'Nhận tiền gửi', icon: CreditCard, tone: 'emerald' as const },
    { href: `/sales?create=1&type=PRODUCT&customerId=${customerId}`, label: 'Bán hàng', icon: ShoppingCart, tone: 'gold' as const },
    { href: `/sales?create=1&type=PROJECT&customerId=${customerId}`, label: 'Tạo dự án', icon: Network, tone: 'dark' as const },
  ]

  const loanSalesCount = salesRecords.filter(record => record.source_type === 'LOAN').length
  const depositSalesCount = salesRecords.filter(record => record.source_type === 'DEPOSIT').length
  const productSalesCount = salesRecords.filter(record => record.source_type === 'PRODUCT').length

  const unexploitedProducts = customer
    ? getUnexploitedProducts(customer, products, salesRecords)
    : []

  return (
    <DashboardLayout title={loading ? "Đang tải..." : `Chi tiết: ${getCustomerFullName(customer)}`}>
      <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-10">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link
            href="/customers"
            className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-200 transition-colors shrink-0 shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-emerald-700" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Hồ sơ Khách hàng</h1>
            <p className="text-sm text-slate-500 mt-0.5 break-all">
              {customer?.cif_code ? `CIF: ${customer.cif_code}` : `Mã KH: ${customerId}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="ml-3 text-slate-600 font-medium">Đang tải dữ liệu...</span>
          </div>
        ) : !customer ? (
          <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-800">Không tìm thấy khách hàng</h2>
            <p className="text-slate-500 mt-2">Khách hàng này không tồn tại hoặc đã bị xóa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Customer Profile */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="relative px-5 pt-5 pb-6 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-800 text-white">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(253,183,26,0.18),transparent_55%)]" />
                  <div className="relative flex flex-col items-center text-center">
                    <div className="w-[72px] h-[72px] bg-white/15 text-white rounded-full flex items-center justify-center text-2xl font-bold mb-3 ring-2 ring-white/25 backdrop-blur-sm">
                      {customer.customer_type === 'ENTERPRISE'
                        ? (customer.business_name?.substring(0, 2).toUpperCase() || 'DN')
                        : (customer.full_name?.split(' ').pop()?.substring(0, 2).toUpperCase() || 'KH')}
                    </div>
                    <h2 className="text-base sm:text-lg font-bold leading-snug break-words max-w-full">
                      {getCustomerFullName(customer)}
                    </h2>
                    <p className="text-sm text-emerald-100 mt-1.5 break-words">
                      Cán bộ QL: {customer.profiles?.full_name || 'Chưa phân bổ'}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2.5 justify-center">
                      {customer.customer_type === 'ENTERPRISE' ? (
                        <>
                          <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/15 text-white border border-white/20 rounded-md">B2B</span>
                          {customer.customer_segment && (
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-gold-500/90 text-emerald-950 rounded-md">
                              {customer.customer_segment}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="px-2 py-0.5 text-[11px] font-semibold bg-white/15 text-white border border-white/20 rounded-md">B2C</span>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2.5 border border-white/25 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium w-full justify-center"
                        >
                          <Edit className="w-4 h-4" /> Chỉnh sửa
                        </button>
                        <button
                          onClick={() => setInteractionModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 text-emerald-950 rounded-lg hover:bg-gold-400 transition-colors text-sm font-bold w-full justify-center shadow-sm"
                        >
                          <Phone className="w-4 h-4" /> Ghi nhận tương tác
                        </button>
                      </div>
                    )}
                  </div>
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
                            <label className="block text-xs font-medium text-slate-500 mb-1">Phân khúc doanh nghiệp</label>
                            <select
                              value={editForm.customer_segment || 'SME'} 
                              onChange={e => setEditForm({...editForm, customer_segment: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium" 
                            >
                              <option value="SME">SME</option>
                              <option value="Hành chính sự nghiệp">Hành chính sự nghiệp</option>
                              <option value="Doanh nghiệp lớn">Doanh nghiệp lớn</option>
                              <option value="FDI">FDI</option>
                              <option value="Khác">Khác</option>
                            </select>
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
                      <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50/40 hover:bg-emerald-50 transition-colors ring-1 ring-emerald-100/60">
                        <div className="flex items-start gap-3 min-w-0">
                          <Phone className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-slate-500">Số điện thoại</p>
                            <p className="text-sm font-semibold text-slate-800">{customer.phone || 'Chưa cập nhật'}</p>
                          </div>
                        </div>
                        {customer.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors active:scale-95 shrink-0"
                            title="Gọi điện"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 ring-1 ring-slate-100">
                        <Mail className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Email</p>
                          <p className="text-sm font-semibold text-slate-800 break-all">{customer.email || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 ring-1 ring-slate-100">
                        <MapPin className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-500">Địa chỉ</p>
                          <p className="text-sm font-semibold text-slate-800 break-words">{customer.address || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
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

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { count: loanSalesCount, label: 'Khoản vay', icon: Briefcase, tone: 'text-emerald-700 bg-emerald-50 ring-emerald-100' },
                  { count: depositSalesCount, label: 'Tiền gửi', icon: CreditCard, tone: 'text-emerald-600 bg-emerald-50 ring-emerald-100' },
                  { count: productSalesCount, label: 'SP Dịch vụ', icon: ShoppingCart, tone: 'text-gold-700 bg-gold-50 ring-gold-100' },
                ].map((stat) => {
                  const StatIcon = stat.icon
                  return (
                    <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm flex flex-col items-center text-center">
                      <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center mb-2 ring-1", stat.tone)}>
                        <StatIcon className="w-4 h-4" />
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-slate-900 tabular-nums">{stat.count}</p>
                      <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-tight">{stat.label}</p>
                    </div>
                  )
                })}
              </div>

            </div>

            {/* Right Column: Related Data */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 sm:px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-100 text-gold-700 ring-1 ring-gold-200">
                        <ShoppingCart className="w-4 h-4" />
                      </span>
                      Bán hàng
                    </h3>
                    <Link
                      href={`/sales?customerId=${customerId}`}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
                    >
                      Xem tất cả <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none snap-x snap-mandatory">
                    {salesActions.map((action) => {
                      const ActionIcon = action.icon
                      return (
                        <Link
                          key={action.href}
                          href={action.href}
                          className={clsx(
                            "inline-flex shrink-0 snap-start items-center gap-1.5 px-3.5 py-2.5 rounded-lg transition-colors text-xs font-bold shadow-sm min-h-[40px]",
                            action.tone === 'gold' && "bg-gold-500 hover:bg-gold-400 text-emerald-950",
                            action.tone === 'emerald' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                            action.tone === 'dark' && "bg-emerald-900 hover:bg-emerald-800 text-white"
                          )}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <ActionIcon className="w-3.5 h-3.5" />
                          {action.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
                <div className="p-0">
                  {salesRecords.length === 0 ? (
                    <div className="py-10 px-4 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Chưa có giao dịch bán hàng</p>
                      <p className="text-xs text-slate-500 mt-1">Dùng các nút phía trên để ghi nhận vay, tiền gửi hoặc sản phẩm.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {salesRecords.slice(0, 8).map(sale => {
                        const saleMeta = getSaleMeta(sale.source_type)
                        const SaleIcon = saleMeta.icon
                        return (
                          <div key={sale.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-emerald-50/30 transition-colors">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              <div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", saleMeta.iconWrap)}>
                                <SaleIcon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-900 break-words">{sale.title || saleMeta.label}</p>
                                  <span className={clsx("px-2 py-0.5 rounded-md text-[11px] font-semibold", saleMeta.badge)}>
                                    {saleMeta.label}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5 break-words">
                                  {sale.category}
                                  {sale.account_number ? ` • Số TK: ${sale.account_number}` : ''}
                                </p>
                                {sale.note && <p className="text-xs text-slate-500 mt-1 break-words">{sale.note}</p>}
                              </div>
                            </div>
                            <div className="sm:text-right flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1 shrink-0 pl-[52px] sm:pl-0">
                              <p className="font-bold text-slate-900 tabular-nums">
                                {sale.source_type === 'PRODUCT'
                                  ? formatMetricValue(getRecordMetricValue(sale), getRecordUnitLabel(sale))
                                  : formatCurrency(Number(sale.amount || 0))}
                              </p>
                              {getStatusBadge(sale.status)}
                              <p className="text-xs text-slate-500">
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

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-4 sm:px-5 py-4 border-b border-emerald-100 bg-gradient-to-r from-white to-emerald-50/40">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    Gợi ý bán chéo
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-2xl">
                    Sản phẩm chưa khai thác trên hồ sơ. Bấm để mở form ghi nhận bán hàng nhanh.
                  </p>
                </div>
                <div className="p-4 sm:p-5">
                  {unexploitedProducts.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm font-medium text-emerald-700">Đã khai thác toàn bộ sản phẩm</p>
                      <p className="text-xs text-slate-500 mt-1">Không còn gợi ý bán chéo cho khách hàng này.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {unexploitedProducts.map(p => (
                        <Link
                          key={p.id}
                          href={`/sales?create=1&type=PRODUCT&customerId=${customerId}&productId=${p.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-emerald-800 rounded-lg text-sm font-semibold border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 transition-colors min-h-[40px]"
                        >
                          <Plus className="w-3.5 h-3.5 text-gold-600 shrink-0" />
                          <span className="break-words">{p.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>


              {/* Quick Interaction Modal */}
              <QuickInteractionModal
                isOpen={interactionModalOpen}
                onClose={() => setInteractionModalOpen(false)}
                customerId={customerId}
                managerId={user?.id || ''}
                onSaved={loadData}
              />

              {/* Interactions Section - Now as a Timeline */}
              <CustomerTimeline customerId={customerId} />

            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

// ─── Quick Interaction Modal ────────────────────────────────────────────────
function QuickInteractionModal({
  isOpen,
  onClose,
  customerId,
  managerId,
  onSaved,
}: {
  isOpen: boolean
  onClose: () => void
  customerId: string
  managerId: string
  onSaved: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'CALL',
    purpose: '',
    result: 'PENDING',
    notes: '',
    interaction_date: new Date().toISOString().slice(0, 10),
    follow_up_date: '',
    next_action: '',
  })

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const INTERACTION_TYPES = [
    { value: 'CALL', label: '📞 Gọi điện' },
    { value: 'MEETING', label: '🤝 Gặp mặt' },
    { value: 'EMAIL', label: '✉️ Email' },
    { value: 'SMS', label: '💬 SMS/Zalo' },
    { value: 'VISIT', label: '🏢 Thăm văn phòng' },
  ]

  const RESULT_OPTIONS = [
    { value: 'SUCCESS', label: '✅ Thành công' },
    { value: 'PENDING', label: '⏳ Đang chờ' },
    { value: 'FOLLOW_UP', label: '🔄 Cần theo dõi' },
    { value: 'NO_ANSWER', label: '📵 Không nghe máy' },
    { value: 'NOT_INTERESTED', label: '❌ Không quan tâm' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.purpose.trim()) {
      toast.error('Vui lòng nhập mục đích tương tác')
      return
    }
    try {
      setSaving(true)
      const { createInteraction: apiCreateInteraction } = await import('@/lib/supabase/api')
      await apiCreateInteraction({
        customer_id: customerId,
        manager_id: managerId,
        type: form.type,
        purpose: form.purpose.trim(),
        result: form.result,
        notes: form.notes.trim() || undefined,
        interaction_date: form.interaction_date,
        follow_up_date: form.follow_up_date || undefined,
        next_action: form.next_action.trim() || undefined,
      })
      toast.success('Đã ghi nhận tương tác!')
      setForm({
        type: 'CALL',
        purpose: '',
        result: 'PENDING',
        notes: '',
        interaction_date: new Date().toISOString().slice(0, 10),
        follow_up_date: '',
        next_action: '',
      })
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-xl bg-white p-5 sm:p-6 shadow-2xl ring-1 ring-emerald-100 animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Phone className="w-4 h-4" />
            </span>
            Ghi nhận tương tác mới
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-4 space-y-4 my-2 scrollbar-none">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Loại tương tác</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {INTERACTION_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Kết quả</label>
              <select
                value={form.result}
                onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {RESULT_OPTIONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Mục đích <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="VD: Giới thiệu sản phẩm vay tín chấp, nhắc đáo hạn tiền gửi..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ngày tương tác</label>
              <input
                type="date"
                value={form.interaction_date}
                onChange={e => setForm(f => ({ ...f, interaction_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Ngày theo dõi lại</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Ghi chú</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Nội dung trao đổi, phản hồi của KH..."
              rows={2}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Hành động tiếp theo</label>
            <input
              type="text"
              value={form.next_action}
              onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))}
              placeholder="VD: Gửi hồ sơ vào thứ Hai, gọi lại sau 1 tuần..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </form>

        <div className="flex gap-2 pt-4 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu tương tác
          </button>
        </div>
      </div>
    </div>
  )
}
