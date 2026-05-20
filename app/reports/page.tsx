"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar, Download, Loader2 } from "lucide-react"
import { fetchProfiles, fetchSalesRecords } from "@/lib/supabase/api"
import * as XLSX from 'xlsx'

const SOURCE_LABELS: Record<string, string> = {
  LOAN: 'Khoản vay',
  DEPOSIT: 'Tiền gửi',
  PRODUCT: 'Sản phẩm',
}

const SOURCE_SORT: Record<string, number> = {
  LOAN: 1,
  DEPOSIT: 2,
  PRODUCT: 3,
}

export default function ReportsPage() {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState("month")

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [sales, pr] = await Promise.all([fetchSalesRecords(), fetchProfiles()])
      setSalesRecords(sales)
      setProfiles(pr)
    } catch (err) {
      console.error('Reports load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  const filteredSales = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const startOfWeek = new Date(startOfToday)
    startOfWeek.setDate(startOfWeek.getDate() - 6)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    return salesRecords.filter((sale: any) => {
      const saleDate = new Date(sale.sale_date)
      if (Number.isNaN(saleDate.getTime())) return false

      switch (timeRange) {
        case 'today':
          return saleDate >= startOfToday && saleDate <= endOfToday
        case 'week':
          return saleDate >= startOfWeek && saleDate <= endOfToday
        case 'month':
          return saleDate >= startOfMonth && saleDate <= endOfToday
        case 'quarter':
          return saleDate >= startOfQuarter && saleDate <= endOfToday
        case 'year':
          return saleDate >= startOfYear && saleDate <= endOfToday
        default:
          return true
      }
    })
  }, [salesRecords, timeRange])

  const reportRows = useMemo(() => {
    const rowMap = new Map<string, { key: string; sourceType: string; label: string; unit: string }>()

    filteredSales.forEach((sale: any) => {
      const label = sale.title || sale.category || 'Khác'
      const key = `${sale.source_type}:${label}`

      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key,
          sourceType: sale.source_type,
          label,
          unit: sale.source_type === 'PRODUCT' ? 'SL' : 'VNĐ',
        })
      }
    })

    return Array.from(rowMap.values()).sort((a, b) => {
      const sourceSort = (SOURCE_SORT[a.sourceType] || 99) - (SOURCE_SORT[b.sourceType] || 99)
      if (sourceSort !== 0) return sourceSort
      return a.label.localeCompare(b.label, 'vi')
    })
  }, [filteredSales])

  const getMetricValue = (row: { sourceType: string; label: string; unit: string }, agentId: string) => {
    return filteredSales.reduce((sum: number, sale: any) => {
      const saleLabel = sale.title || sale.category || 'Khác'
      if (sale.agent_id !== agentId || sale.source_type !== row.sourceType || saleLabel !== row.label) {
        return sum
      }

      return sum + (row.unit === 'SL' ? Number(sale.quantity || 1) : Number(sale.amount || 0))
    }, 0)
  }

  const formatMetric = (value: number) => {
    if (!value) return '-'
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  const handleExportExcel = () => {
    const agentNames = profiles.map(p => p.full_name)
    const headers = ['Danh mục', 'Nhóm', 'Đơn vị', ...agentNames, 'Tổng cộng']

    const exportData = reportRows.map((reportRow) => {
      const exportRow: any = {
        'Danh mục': SOURCE_LABELS[reportRow.sourceType] || reportRow.sourceType,
        'Nhóm': reportRow.label,
        'Đơn vị': reportRow.unit,
      }
      
      let rowTotal = 0
      profiles.forEach((agent) => {
        const value = getMetricValue(reportRow, agent.id)
        exportRow[agent.full_name] = value
        rowTotal += value
      })
      
      exportRow['Tổng cộng'] = rowTotal
      return exportRow
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers })
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoBanHang")
    
    XLSX.writeFile(workbook, `BaoCao_BanHang_${timeRange}_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  if (!mounted) return null

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
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Thống Kê Bán Hàng Theo Cán Bộ</h2>
            <p className="text-xs text-slate-500 mt-1">Khoản vay và tiền gửi tính theo VNĐ, sản phẩm khác tính theo số lượng.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="ml-2 text-slate-500">Đang tải...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[980px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-4 px-4 font-semibold text-slate-700 text-sm border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-44">
                      Danh mục
                    </th>
                    <th className="py-4 px-4 font-semibold text-slate-700 text-sm border-r border-slate-200 sticky left-[176px] bg-slate-50 z-10 w-64">
                      Nhóm bán hàng
                    </th>
                    <th className="py-4 px-4 font-semibold text-slate-700 text-sm text-center min-w-[80px] border-r border-slate-200">
                      Đơn vị
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
                  {reportRows.map((row) => {
                    let rowTotal = 0
                    return (
                      <tr key={row.key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 text-sm font-medium text-slate-800 border-r border-slate-100 sticky left-0 bg-white shadow-[1px_0_0_0_#f1f5f9]">
                          {SOURCE_LABELS[row.sourceType] || row.sourceType}
                        </td>
                        <td className="py-4 px-4 text-sm font-medium text-slate-800 border-r border-slate-100 sticky left-[176px] bg-white shadow-[1px_0_0_0_#f1f5f9]">
                          {row.label}
                        </td>
                        <td className="py-4 px-4 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-100">
                          {row.unit}
                        </td>
                        {profiles.map((agent: any) => {
                          const value = getMetricValue(row, agent.id)
                          rowTotal += value
                          return (
                            <td key={agent.id} className="py-4 px-4 text-center">
                              <span className={value > 0 ? "inline-flex items-center justify-center min-w-8 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-300 font-medium"}>
                                {formatMetric(value)}
                              </span>
                            </td>
                          )
                        })}
                        <td className="py-4 px-4 text-center bg-slate-50/30">
                          <span className="font-bold text-slate-800">{formatMetric(rowTotal)}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {reportRows.length === 0 && (
                    <tr><td colSpan={profiles.length + 4} className="py-12 text-center text-slate-500">Chưa có dữ liệu bán hàng trong khoảng thời gian này.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
