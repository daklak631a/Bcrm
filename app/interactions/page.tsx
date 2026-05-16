"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Search, Plus, Filter, MoreHorizontal, MessageSquare, PhoneCall, CalendarDays, Mail } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData } from "@/lib/mockData"
import { useEffect, useState } from "react"
import Link from "next/link"
import { TableSkeleton } from "@/components/skeletons"

export default function InteractionsPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { interactions } = getFilteredData(user, agents, storeCustomers)

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneCall className="w-4 h-4" />
      case "meeting": return <CalendarDays className="w-4 h-4" />
      case "email": return <Mail className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "call": return "Gọi điện"
      case "meeting": return "Gặp mặt"
      case "email": return "Email"
      default: return "Tin nhắn"
    }
  }

  if (!mounted) return <TableSkeleton title="Quản Lý Tương Tác" columns={7} />;

  return (
    <DashboardLayout title="Quản Lý Tương Tác">
      <div className="flex flex-col gap-6">
        {/* KPI Cards for Interactions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Tổng Tương Tác</p>
              <h3 className="text-2xl font-bold text-slate-800">{interactions.length}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Cuộc Gọi</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {interactions.filter(i => i.type === 'call').length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Gặp Mặt</p>
              <h3 className="text-2xl font-bold text-slate-800">
                 {interactions.filter(i => i.type === 'meeting').length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Lịch Sắp Tới</p>
              <h3 className="text-2xl font-bold text-slate-800">
                 {interactions.filter(i => i.status === 'Pending').length}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <CalendarDays className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm nội dung, khách hàng..." 
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full" 
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium shrink-0">
              <Filter className="w-4 h-4" /> Lọc
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium shrink-0">
            <Plus className="w-4 h-4" /> Thêm Tương Tác
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-sm text-slate-600 font-medium">
                  <th className="py-3 px-4 font-semibold pb-3 w-12">Loại</th>
                  <th className="py-3 px-4 font-semibold">Khách Hàng</th>
                  <th className="py-3 px-4 font-semibold">Nội Dung Mô Tả</th>
                  <th className="py-3 px-4 font-semibold">Thời Gian</th>
                  <th className="py-3 px-4 font-semibold">Chuyên Viên</th>
                  <th className="py-3 px-4 font-semibold">Trạng Thái</th>
                  <th className="py-3 px-4 font-semibold text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interactions.map((interaction) => (
                  <tr key={interaction.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center tooltip" title={getTypeLabel(interaction.type)}>
                        {getIcon(interaction.type)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-slate-800">
                      <Link href={`/customers/${interaction.customerId}`} className="hover:text-emerald-600 hover:underline">
                        {interaction.customerName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{interaction.title}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{interaction.date}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{interaction.agentName}</td>
                    <td className="py-3 px-4">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium inline-block",
                        interaction.status === "Completed" ? "bg-emerald-100 text-emerald-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {interaction.status === "Completed" ? "Đã Xong" : "Đang Chờ"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {interactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Không tìm thấy tương tác nào.
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
