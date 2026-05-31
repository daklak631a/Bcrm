"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeft, Loader2, Search, Package, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { fetchBatchSales, fetchCustomers, fetchProfiles, allocateBatchSale, getCustomerFullName } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"
import { formatMetricNumber } from "@/lib/product-metrics"
import { filterAgentRecordsByAccess, filterCustomersByAccess } from "@/lib/access-control"

export default function BatchAllocatePage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [batchSales, setBatchSales] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [allocating, setAllocating] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState<Record<string, string>>({})
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Record<string, string>>({})

  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2'

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const [batches, cust, profileRows] = await Promise.all([
        fetchBatchSales(isAdmin ? undefined : user.id),
        fetchCustomers(),
        fetchProfiles(),
      ])
      setProfiles(profileRows)
      setBatchSales(filterAgentRecordsByAccess(batches, profileRows, user))
      setCustomers(filterCustomersByAccess(cust, profileRows, user))
    } catch (err: any) {
      toast.error("Lỗi tải dữ liệu: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  const getFilteredCustomers = (recordId: string) => {
    const scopedCustomers = filterCustomersByAccess(customers, profiles, user)
    const q = (customerSearch[recordId] || '').toLowerCase().trim()
    if (!q) return scopedCustomers.slice(0, 20) // Show first 20 by default
    const qPhone = q.replace(/\D/g, '')
    return scopedCustomers.filter(c => {
      const nameMatch = getCustomerFullName(c).toLowerCase().includes(q)
      if (nameMatch) return true
      if (!qPhone) return false
      return (c.phone || '').replace(/\D/g, '').includes(qPhone)
    })
  }

  const handleAllocate = async (recordId: string) => {
    const customerId = selectedCustomer[recordId]
    if (!customerId) {
      toast.error("Vui lòng chọn khách hàng trước khi phân bổ")
      return
    }
    if (!filterCustomersByAccess(customers, profiles, user).some((customer) => customer.id === customerId)) {
      toast.error("Không thể phân bổ cho khách hàng ngoài phạm vi quản lý")
      return
    }
    try {
      setAllocating(recordId)
      await allocateBatchSale(recordId, customerId)
      toast.success("Đã phân bổ thành công!")
      setBatchSales(prev => prev.filter(s => s.id !== recordId))
      // Clean up local state
      setSelectedCustomer(prev => { const n = {...prev}; delete n[recordId]; return n })
      setCustomerSearch(prev => { const n = {...prev}; delete n[recordId]; return n })
    } catch (err: any) {
      toast.error("Lỗi phân bổ: " + err.message)
    } finally {
      setAllocating(null)
    }
  }

  if (!mounted) return null

  return (
    <DashboardLayout title="Phân Bổ Lô Cuối Ngày">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/sales"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại Bảng Bán Hàng
            </Link>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {batchSales.length} bản ghi lô chưa phân bổ
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-semibold text-amber-900 mb-1">Phân bổ kết quả lô vào khách hàng cụ thể</h2>
          <p className="text-sm text-amber-700">
            Các bản ghi sau được ghi nhận theo lô (không có KH cụ thể). Hãy chọn KH tương ứng và nhấn &quot;Phân bổ&quot; để gán vào từng khách hàng.
          </p>
        </div>

        {/* Batch records table */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="ml-2 text-slate-500">Đang tải...</span>
            </div>
          ) : batchSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <p className="text-slate-500 font-medium">Không có bản ghi lô nào cần phân bổ!</p>
              <Link href="/sales" className="text-sm text-emerald-600 hover:underline">← Quay lại Bảng Bán Hàng</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-sm text-slate-600 font-medium">
                    <th className="py-3 px-4 font-semibold">Ngày</th>
                    <th className="py-3 px-4 font-semibold">Sản phẩm</th>
                    <th className="py-3 px-4 font-semibold">Kết quả</th>
                    <th className="py-3 px-4 font-semibold">Ghi chú lô</th>
                    {isAdmin && <th className="py-3 px-4 font-semibold">Cán bộ</th>}
                    <th className="py-3 px-4 font-semibold min-w-[260px]">Phân bổ cho KH</th>
                    <th className="py-3 px-4 font-semibold text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batchSales.map((record) => {
                    const isAllocatingThis = allocating === record.id
                    const hasCustomer = !!selectedCustomer[record.id]
                    const filteredCusts = getFilteredCustomers(record.id)
                    const selectedCustName = customers.find(c => c.id === selectedCustomer[record.id])

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-sm text-slate-600">
                          {new Date(record.sale_date).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{record.cross_sell_products?.name || '—'}</p>
                              <p className="text-xs text-slate-400">{record.cross_sell_products?.type || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-sm font-semibold">
                            {formatMetricNumber(record.result_value || 0)}
                            <span className="text-[10px] font-normal">{record.cross_sell_products?.unit_label || ''}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500 max-w-[160px] truncate" title={record.batch_note}>
                          {record.batch_note || <span className="text-slate-300">—</span>}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-sm text-slate-700">
                            {record.profiles?.full_name || '—'}
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="relative">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                placeholder={selectedCustName ? getCustomerFullName(selectedCustName) : "Tìm KH..."}
                                value={customerSearch[record.id] || ''}
                                onChange={(e) => {
                                  setCustomerSearch(prev => ({ ...prev, [record.id]: e.target.value }))
                                  setSelectedCustomer(prev => { const n = {...prev}; delete n[record.id]; return n })
                                  setShowDropdown(record.id)
                                }}
                                onFocus={() => setShowDropdown(record.id)}
                                className={`pl-8 pr-3 py-1.5 text-sm border rounded-lg w-full outline-none focus:ring-2 focus:ring-amber-400 transition-all ${hasCustomer ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200'}`}
                              />
                            </div>
                            {showDropdown === record.id && filteredCusts.length > 0 && (
                              <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                                {filteredCusts.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomer(prev => ({ ...prev, [record.id]: c.id }))
                                      setCustomerSearch(prev => ({ ...prev, [record.id]: '' }))
                                      setShowDropdown(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                                  >
                                    <span className="font-medium text-slate-800">{getCustomerFullName(c)}</span>
                                    {c.phone && <span className="text-xs text-slate-400 font-mono">{c.phone}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                            {showDropdown === record.id && <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(null)} />}
                          </div>
                          {hasCustomer && selectedCustName && (
                            <p className="text-xs text-emerald-600 mt-1 font-medium">✓ {getCustomerFullName(selectedCustName)}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleAllocate(record.id)}
                            disabled={!hasCustomer || isAllocatingThis}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-amber-500 text-white hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400"
                          >
                            {isAllocatingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Phân bổ
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
