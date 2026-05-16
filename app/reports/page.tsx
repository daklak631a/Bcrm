"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import { useDataStore } from "@/store/useDataStore"
import { getFilteredData } from "@/lib/mockData"
import { useState, useEffect } from "react"
import { Calendar, Filter, Download } from "lucide-react"

export default function ReportsPage() {
  const { user } = useAuthStore()
  const { agents, customers: storeCustomers } = useDataStore()
  const [mounted, setMounted] = useState(false)
  const [timeRange, setTimeRange] = useState("month")

  useEffect(() => {
    setMounted(true)
  }, [])

  const { products, productSales } = getFilteredData(user, agents, storeCustomers)

  // Get allowed agents for columns (admin_1 sees all or filtered by group? Let's show all that the admin is allowed to see)
  let allowedAgents = agents
  if (user?.role === 'admin_2') {
    allowedAgents = agents.filter(a => a.branchId === user.branchId)
  }

  if (!mounted) return null;

  // Aggregate data:
  // For each product (row), and each agent (col), count total successful sales.
  // We can filter productSales by a mocked date logic if needed, but since it's a dummy app, 
  // we just simulate data matching the range or show the same for now, or randomly adjust.
  // Actually, we have specific dates in productSales, we could parse them, but with small mock data,
  // we just use them directly.

  const getSalesCount = (productId: string, agentId: string) => {
    return productSales.filter(s => s.productId === productId && s.agentId === agentId && s.status === 'Success').length
  }

  return (
    <DashboardLayout title="Báo Cáo Tổng Hợp">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="relative">
               <select 
                 className="appearance-none pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                 value={timeRange}
                 onChange={(e) => setTimeRange(e.target.value)}
               >
                 <option value="today">Hôm nay</option>
                 <option value="week">Tuần này</option>
                 <option value="month">Tháng này</option>
                 <option value="quarter">Quý này</option>
                 <option value="year">Năm nay</option>
                 <option value="custom">Tùy chỉnh...</option>
               </select>
               <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                 <input type="date" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-emerald-500" />
                 <span className="text-slate-400">-</span>
                 <input type="date" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:ring-2 focus:ring-emerald-500" />
              </div>
            )}
            <button className="flex items-center justify-center p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
               <Filter className="w-4 h-4" />
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shrink-0">
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-[0_1px_3px_rgb(0_0_0_/_2%)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Thống Kê Bán Chéo Theo Cán Bộ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-4 font-semibold text-slate-700 text-sm border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-64">
                     Danh mục sản phẩm
                  </th>
                  {allowedAgents.map(agent => (
                    <th key={agent.id} className="py-4 px-4 font-semibold text-slate-700 text-sm text-center min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">
                          {agent.name.charAt(0)}
                        </div>
                        <span className="truncate w-full">{agent.name}</span>
                        <span className="text-[10px] font-normal text-slate-400 bg-white px-2 py-0.5 rounded border">
                           {agent.branchId}
                        </span>
                      </div>
                    </th>
                  ))}
                  <th className="py-4 px-4 font-bold text-slate-800 text-sm text-center bg-slate-100/50 min-w-[100px]">
                    Tổng cộng
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, idx) => {
                  let rowTotal = 0;
                  return (
                    <tr key={product.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-medium text-slate-800 border-r border-slate-100 sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9]">
                        <div className="flex flex-col">
                           <span>{product.name}</span>
                           <span className="text-xs text-slate-400 font-normal">{product.type}</span>
                        </div>
                      </td>
                      {allowedAgents.map(agent => {
                        const count = getSalesCount(product.id, agent.id);
                        rowTotal += count;
                        return (
                          <td key={agent.id} className="py-4 px-4 text-center">
                            <span className={count > 0 ? "inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-300 font-medium"}>
                              {count > 0 ? count : "-"}
                            </span>
                          </td>
                        )
                      })}
                      <td className="py-4 px-4 text-center bg-slate-50/30">
                        <span className="font-bold text-slate-800">{rowTotal}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200">
                 <tr>
                    <td className="py-4 px-4 font-bold text-slate-800 sticky left-0 bg-slate-50 text-right">
                       Tổng tất cả:
                    </td>
                    {allowedAgents.map(agent => {
                      const totalAgent = products.reduce((acc, p) => acc + getSalesCount(p.id, agent.id), 0);
                      return (
                        <td key={agent.id} className="py-4 px-4 text-center font-bold text-slate-800">
                          {totalAgent}
                        </td>
                      )
                    })}
                    <td className="py-4 px-4 text-center font-bold text-emerald-600 text-lg">
                      {products.reduce((acc, p) => acc + allowedAgents.reduce((sum, a) => sum + getSalesCount(p.id, a.id), 0), 0)}
                    </td>
                 </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
