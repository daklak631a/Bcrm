"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, TrendingUp, PiggyBank, CalendarClock } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData, formatCurrency } from "@/lib/mockData"
import { useEffect, useState } from "react"
import Link from "next/link"
import { TableSkeleton } from "@/components/skeletons"

export default function DepositsPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { deposits } = getFilteredData(user, agents, storeCustomers)

  if (!mounted) return <TableSkeleton title="Quản Lý Tiền Gửi" />;

  return (
    <DashboardLayout title="Quản Lý Tiền Gửi">
      <div className="flex flex-col gap-6">
        {/* KPI Cards for Deposits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <PiggyBank className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng Vốn Huy Động</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              {formatCurrency(deposits.reduce((acc, curr) => acc + curr.amount, 0))}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Số Lượng Giao Dịch</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              {deposits.length} <span className="text-lg font-medium text-slate-500">GD</span>
            </h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <CalendarClock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Chờ Phát Hành Sổ</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              {deposits.filter(d => d.status === 'Pending').length} <span className="text-lg font-medium text-slate-500">Khách</span>
            </h3>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã HĐ, khách hàng..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full outline-none" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium shrink-0">
              <Filter className="w-4 h-4" /> Lọc
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0 shadow-sm">
            <Plus className="w-4 h-4" /> Mở Sổ Mới
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-sm text-slate-600 font-medium">
                  <th className="py-3 px-4 font-semibold pb-3">Mã Sổ Gửi</th>
                  <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                  <th className="py-3 px-4 font-semibold">Loại Tiền Gửi</th>
                  <th className="py-3 px-4 font-semibold">Số Tiền (VNĐ)</th>
                  <th className="py-3 px-4 font-semibold">Kỳ Hạn & Lãi Suất</th>
                  <th className="py-3 px-4 font-semibold">Ngày Đến Hạn</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deposits.map((deposit) => (
                  <tr key={deposit.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{deposit.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      <Link href={`/customers/${deposit.customerId}`} className="hover:text-emerald-600 hover:underline">
                        {deposit.customerName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{deposit.type}</td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(deposit.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-800">{deposit.term}</span>
                        <span className="text-xs text-slate-500">LS: {deposit.rate}/năm</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{deposit.maturityDate}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium inline-block",
                        deposit.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                        deposit.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {deposit.status === "Active" ? "Đang gửi" : 
                         deposit.status === "Pending" ? "Chờ duyệt" : "Đã tất toán"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Không tìm thấy khoản gửi nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
