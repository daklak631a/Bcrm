"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuthStore } from "@/store/useAuthStore"
import { useState, useEffect, useCallback } from "react"
import { Calendar, Download, Loader2 } from "lucide-react"
import { fetchProducts, fetchProductSales, fetchProfiles, getCustomerFullName } from "@/lib/supabase/api"
import * as XLSX from 'xlsx'

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [productSales, setProductSales] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState("month")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [p, ps, pr] = await Promise.all([fetchProducts(), fetchProductSales(), fetchProfiles()])
      setProducts(p)
      setProductSales(ps)
      setProfiles(pr)
    } catch (err) {
      console.error('Reports load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  if (!mounted) return null

  const getSalesCount = (productId: string, agentId: string) => {
    return productSales.filter((s: any) => s.product_id === productId && s.agent_id === agentId && s.status === 'Success').length
  }

  const handleExportExcel = () => {
    // Chuẩn bị dữ liệu header
    const agentNames = profiles.map(p => p.full_name)
    const headers = ['Sản phẩm', 'Loại', ...agentNames, 'Tổng cộng']

    // Chuẩn bị các dòng dữ liệu
    const exportData = products.map((product) => {
      const row: any = {
        'Sản phẩm': product.name,
        'Loại': product.type
      }
      
      let rowTotal = 0
      profiles.forEach((agent) => {
        const count = getSalesCount(product.id, agent.id)
        row[agent.full_name] = count
        rowTotal += count
      })
      
      row['Tổng cộng'] = rowTotal
      return row
    })

    // Dòng tổng cộng tất cả
    const totalRow: any = {
      'Sản phẩm': 'Tổng tất cả',
      'Loại': ''
    }
    
    let grandTotal = 0
    profiles.forEach((agent) => {
      const totalAgent = products.reduce((acc, p) => acc + getSalesCount(p.id, agent.id), 0)
      totalRow[agent.full_name] = totalAgent
      grandTotal += totalAgent
    })
    totalRow['Tổng cộng'] = grandTotal
    
    exportData.push(totalRow)

    // Tạo file Excel
    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoDongLuc")
    
    // Tải xuống
    XLSX.writeFile(workbook, `BaoCao_DongLuc_${timeRange}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <DashboardLayout title="Báo Cáo Tổng Hợp">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="appearance-none pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="quarter">Quý này</option>
                <option value="year">Năm nay</option>
              </select>
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shrink-0"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
        </div>

        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Thống Kê Bán Chéo Theo Cán Bộ</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4 font-semibold text-slate-700 text-sm border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-64">
                      Danh mục sản phẩm
                    </th>
                    {profiles.map((agent: any) => (
                      <th key={agent.id} className="py-4 px-4 font-semibold text-slate-700 text-sm text-center min-w-[140px]">
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                            {agent.full_name?.charAt(0) || 'U'}
                          </div>
                          <span className="truncate w-full">{agent.full_name}</span>
                          <span className="text-[10px] font-normal text-slate-400 bg-white px-2 py-0.5 rounded border">
                            {agent.department_id || '—'}
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
                  {products.map((product: any) => {
                    let rowTotal = 0
                    return (
                      <tr key={product.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-slate-800 border-r border-slate-100 sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9]">
                          <div className="flex flex-col">
                            <span>{product.name}</span>
                            <span className="text-xs text-slate-400 font-normal">{product.type}</span>
                          </div>
                        </td>
                        {profiles.map((agent: any) => {
                          const count = getSalesCount(product.id, agent.id)
                          rowTotal += count
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
                  {products.length === 0 && (
                    <tr><td colSpan={profiles.length + 2} className="py-12 text-center text-slate-500">Chưa có sản phẩm nào.</td></tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td className="py-4 px-4 font-bold text-slate-800 sticky left-0 bg-slate-50 text-right">
                      Tổng tất cả:
                    </td>
                    {profiles.map((agent: any) => {
                      const totalAgent = products.reduce((acc: number, p: any) => acc + getSalesCount(p.id, agent.id), 0)
                      return (
                        <td key={agent.id} className="py-4 px-4 text-center font-bold text-slate-800">
                          {totalAgent}
                        </td>
                      )
                    })}
                    <td className="py-4 px-4 text-center font-bold text-emerald-600 text-lg">
                      {products.reduce((acc: number, p: any) => acc + profiles.reduce((sum: number, a: any) => sum + getSalesCount(p.id, a.id), 0), 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
