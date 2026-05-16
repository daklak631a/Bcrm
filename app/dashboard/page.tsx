"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { MessageSquare } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData, formatCurrency } from "@/lib/mockData"
import { useEffect, useState } from "react"
import Link from "next/link"
import { DashboardSkeleton } from "@/components/skeletons"
import { KPISummaryTable } from "@/components/ui/kpi-summary-table"

import { Package, TrendingUp } from "lucide-react"

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { customers, loans, deposits, interactions, productSales } = getFilteredData(user, agents, storeCustomers)

  if (!mounted) return <DashboardSkeleton />;

  return (
    <DashboardLayout title="Trang Tổng Quan CRM">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
          <p className="text-sm font-medium text-slate-500 mb-1">Khách Hàng Đang QL</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{customers.length}</h3>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Tăng 2</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
          <p className="text-sm font-medium text-slate-500 mb-1">Dư Nợ Cho Vay</p>
          <div className="flex items-end justify-between overflow-hidden">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(loans.reduce((a, b) => a + b.amount, 0))}>
              {formatCurrency(loans.reduce((a, b) => a + b.amount, 0))}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
          <p className="text-sm font-medium text-slate-500 mb-1">Tổng Vốn Huy Động</p>
          <div className="flex items-end justify-between overflow-hidden">
            <h3 className="text-2xl font-bold font-mono tracking-tight text-slate-800 truncate" title={formatCurrency(deposits.reduce((a, b) => a + b.amount, 0))}>
              {formatCurrency(deposits.reduce((a, b) => a + b.amount, 0))}
            </h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
          <p className="text-sm font-medium text-slate-500 mb-1">Lịch Hẹn Cần Xử Lý</p>
          <div className="flex items-end justify-between">
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">{interactions.length}</h3>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <KPISummaryTable />
      </div>

      {user?.role === 'admin_2' && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] p-6 overflow-hidden mb-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">
            Hoạt Động Cán Bộ ({user.branchId})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {agents.filter(a => a.branchId === user.branchId).map(agent => (
               <div key={agent.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex items-start gap-4 transition-all hover:bg-slate-100/50">
                 <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {agent.name.charAt(0)}
                    </div>
                    <div className={clsx(
                      "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-50",
                      agent.currentStatus === 'meeting' ? 'bg-rose-500' :
                      agent.currentStatus === 'calling' ? 'bg-amber-500' :
                      agent.currentStatus === 'processing' ? 'bg-blue-500' :
                      'bg-emerald-500'
                    )} title={agent.currentStatus}></div>
                 </div>
                 <div className="min-w-0">
                   <p className="font-medium text-slate-900 text-sm truncate">{agent.name}</p>
                   <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{agent.currentTask}</p>
                 </div>
               </div>
             ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">Khách Hàng Mới Cập Nhật</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b text-sm text-slate-500">
                  <th className="font-medium py-3 px-4">Tên Khách Hàng</th>
                  <th className="font-medium py-3 px-4">Phân Hạng</th>
                  <th className="font-medium py-3 px-4">Trạng Thái</th>
                  <th className="font-medium py-3 px-4">Quản Lý Phụ Trách</th>
                </tr>
              </thead>
              <tbody>
                {customers.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <Link href={`/customers/${row.id}`} className="hover:text-emerald-600 hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium inline-block",
                        row.tier === "VIP" ? "bg-purple-100 text-purple-700" :
                        row.tier === "Platinum" ? "bg-slate-200 text-slate-700" :
                        row.tier === "Gold" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      )}>
                        {row.tier}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                       <span className={clsx(
                         "px-2 px-1 text-xs font-medium rounded-full",
                         row.status === "Active" ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
                       )}>
                         {row.status}
                       </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-sm">{row.agentName}</td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      Không có khách hàng
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight">Lịch Hẹn Cần Xử Lý</h2>
          <div className="space-y-4 overflow-y-auto max-h-[300px]">
            {interactions.filter(i => i.status === "Pending").map((task, i) => (
              <div key={i} className="flex gap-4 items-start p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-800 text-sm leading-tight">{task.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Khách hàng: <b>{task.customerName}</b></p>
                  <p className="text-xs text-slate-400 mt-0.5">{task.date}</p>
                 </div>
              </div>
            ))}
            {interactions.filter(i => i.status === "Pending").length === 0 && (
              <p className="text-center text-slate-500 text-sm mt-8">Không có lịch hẹn nào sắp tới.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] p-6 overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 tracking-tight flex items-center gap-2">
           <TrendingUp className="w-5 h-5 text-indigo-500"/>
           Kết Quả Bán Chéo Gần Đây
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {productSales.slice(0, 8).map(sale => (
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
                  <h4 className="font-medium text-slate-800 text-sm mb-1 leading-snug">{sale.productName}</h4>
                  <p className="text-xs text-slate-500 mb-2">Khách: {sale.customerName}</p>
                  <p className="text-[11px] text-slate-400">{sale.date}</p>
               </div>
            </div>
          ))}
          {productSales.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500">
               Chưa có dữ liệu bán chéo.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
