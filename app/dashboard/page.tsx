"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { MessageSquare, Package, TrendingUp, Loader2 } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { KPISummaryTable } from "@/components/ui/kpi-summary-table"
import { fetchCustomers, fetchLoans, fetchDeposits, fetchInteractions, fetchProductSales, fetchProfiles, formatCurrency, getCustomerFullName } from "@/lib/supabase/api"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [interactions, setInteractions] = useState<any[]>([])
  const [productSales, setProductSales] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [c, l, d, i, ps, p] = await Promise.all([
        fetchCustomers(), fetchLoans(), fetchDeposits(),
        fetchInteractions(), fetchProductSales(), fetchProfiles()
      ])
      setCustomers(c)
      setLoans(l)
      setDeposits(d)
      setInteractions(i)
      setProductSales(ps)
      setProfiles(p)
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  if (!mounted) return null

  const activeLoans = loans.filter((l: any) => l.status === 'ACTIVE')
  const totalLoanBalance = activeLoans.reduce((sum: number, l: any) => sum + Number(l.balance || 0), 0)
  const activeDeposits = deposits.filter((d: any) => d.status === 'ACTIVE')
  const totalDepositAmount = activeDeposits.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0)
  const pendingInteractions = interactions.filter((i: any) => i.result === 'PENDING')

  if (loading) {
    return (
      <DashboardLayout title="Trang Tổng Quan CRM">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="ml-3 text-slate-500 text-lg">Đang tải dữ liệu...</span>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Trang Tổng Quan CRM">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Khách Hàng Đang QL</p>
          <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{customers.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Dư Nợ Cho Vay</p>
          <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(totalLoanBalance)}>
            {formatCurrency(totalLoanBalance)}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng Vốn Huy Động</p>
          <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(totalDepositAmount)}>
            {formatCurrency(totalDepositAmount)}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 mb-1">Lịch Hẹn Cần Xử Lý</p>
          <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{pendingInteractions.length}</h3>
        </div>
      </div>

      {/* KPI Summary Table */}
      <div className="mb-6">
        <KPISummaryTable />
      </div>

      {/* Team Activity (for admin) */}
      {(user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2') && profiles.length > 1 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">Đội Ngũ Nhân Viên</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((agent: any) => {
              const agentCustomers = customers.filter((c: any) => c.assigned_manager_id === agent.id).length
              const agentInteractions = interactions.filter((i: any) => i.manager_id === agent.id).length
              return (
                <div key={agent.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-start gap-4 hover:bg-slate-100/50 transition-colors">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {agent.full_name?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{agent.full_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{agentCustomers} KH • {agentInteractions} tương tác</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">Khách Hàng Mới Nhất</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="font-medium py-3 px-4">Tên Khách Hàng</th>
                  <th className="font-medium py-3 px-4">Liên hệ</th>
                  <th className="font-medium py-3 px-4">Chuyên viên</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 5).map((row: any) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700">{getCustomerFullName(row)}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{row.phone || row.email || '—'}</td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{row.profiles?.full_name || '—'}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={3} className="py-8 text-center text-slate-500">Chưa có khách hàng</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Interactions */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">Lịch Hẹn Cần Xử Lý</h2>
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {pendingInteractions.slice(0, 10).map((task: any) => (
              <div key={task.id} className="flex gap-4 items-start p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm leading-tight">{task.purpose}</p>
                  <p className="text-xs text-slate-500 mt-1">KH: <b>{task.customers ? getCustomerFullName(task.customers) : '—'}</b></p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(task.interaction_date).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
            ))}
            {pendingInteractions.length === 0 && (
              <p className="text-center text-slate-500 text-sm mt-8">Không có lịch hẹn nào cần xử lý.</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Cross-sell Sales */}
      <div className="mt-6 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm p-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-500" /> Kết Quả Bán Chéo Gần Đây
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {productSales.slice(0, 8).map((sale: any) => (
            <div key={sale.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 pt-4 opacity-10">
                <Package className="w-12 h-12 text-indigo-500 transform group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" />
              </div>
              <div className="relative z-10">
                <span className={clsx(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full inline-block mb-2",
                  sale.status === 'Success' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}>
                  {sale.status === 'Success' ? 'Thành công' : 'Đang xử lý'}
                </span>
                <h4 className="font-medium text-slate-800 text-sm mb-1">{sale.cross_sell_products?.name || '—'}</h4>
                <p className="text-xs text-slate-500 mb-2">KH: {sale.customers ? getCustomerFullName(sale.customers) : '—'}</p>
                <p className="text-[11px] text-slate-400">{new Date(sale.sale_date).toLocaleDateString('vi-VN')}</p>
              </div>
            </div>
          ))}
          {productSales.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500">Chưa có dữ liệu bán chéo.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
