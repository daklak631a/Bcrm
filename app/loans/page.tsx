"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, ArrowUpRight, CheckCircle2, Clock } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData, formatCurrency } from "@/lib/mockData"
import { useEffect, useState } from "react"
import Link from "next/link"
import { TableSkeleton } from "@/components/skeletons"

export default function LoansPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { loans } = getFilteredData(user, agents, storeCustomers)

  if (!mounted) return <TableSkeleton title="Quản Lý Khoản Vay" />;

  return (
    <DashboardLayout title="Quản Lý Khoản Vay">
      <div className="flex flex-col gap-6">
        {/* KPI Cards for Loans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng Dư Nợ Quản Lý</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              {formatCurrency(loans.reduce((acc, curr) => acc + curr.amount, 0))}
            </h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Hồ Sơ Chờ Duyệt</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
              {loans.filter(l => l.status === 'Pending').length} <span className="text-lg font-medium text-slate-500">Hồ Sơ</span>
            </h3>
          </div>
          <div className="bg-white p-6 rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)]">
            <div className="flex justify-between items-start mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">Khoản Vay Đang Hoạt Động</p>
            <h3 className="text-3xl font-bold font-mono tracking-tight text-slate-800">
               {loans.filter(l => l.status === 'Active').length} <span className="text-lg font-medium text-slate-500">Hồ Sơ</span>
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
            <Plus className="w-4 h-4" /> Tạo Khoản Vay
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-sm text-slate-600 font-medium">
                  <th className="py-3 px-4 font-semibold pb-3">Mã Hồ Sơ</th>
                  <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                  <th className="py-3 px-4 font-semibold">Loại Vay</th>
                  <th className="py-3 px-4 font-semibold">Số Tiền (VNĐ)</th>
                  <th className="py-3 px-4 font-semibold">Thời Hạn & Lãi Suất</th>
                  <th className="py-3 px-4 font-semibold">Ngày Giải Ngân</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{loan.id}</td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      <Link href={`/customers/${loan.customerId}`} className="hover:text-emerald-600 hover:underline">
                        {loan.customerName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{loan.type}</td>
                    <td className="py-3 px-4 text-sm font-medium text-emerald-700">{formatCurrency(loan.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-800">{loan.term}</span>
                        <span className="text-xs text-slate-500">LS: {loan.rate}/năm</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">{loan.date}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1",
                        loan.status === "Active" ? "bg-emerald-100 text-emerald-700" :
                        loan.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {loan.status === "Active" && <CheckCircle2 className="w-3 h-3" />}
                        {loan.status === "Pending" && <Clock className="w-3 h-3" />}
                        {loan.status === "Active" ? "Đang trả nợ" : 
                         loan.status === "Pending" ? "Chờ duyệt" : "Đã tất toán"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {loans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      Không tìm thấy khoản vay nào.
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
