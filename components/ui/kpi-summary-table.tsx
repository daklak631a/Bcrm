'use client'

import { useState, useCallback, useRef } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'
import { Download, RefreshCw } from 'lucide-react'
import html2canvas from 'html2canvas'
import { formatShortName } from '@/lib/utils'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { toast } from 'sonner'

interface KPISummary {
  manager_id: string
  full_name: string
  short_name?: string
  loans_amount: number
  deposits_amount: number
  calls: number
  target_loans_amount: number
  target_deposits_amount: number
  target_calls: number
  cif_moi: number
  bidv_direct: number
  bh_nhan_tho: number
  bh_khoan_vay: number
  huy_dong_tang_rong: number
  du_no_ngan_han_tang_rong: number
  du_no_trung_han_tang_rong: number
  cap_moi_hmtd: number
  target_cif_moi: number
  target_bidv_direct: number
  target_bh_nhan_tho: number
  target_bh_khoan_vay: number
  target_huy_dong_tang_rong: number
  target_du_no_ngan_han_tang_rong: number
  target_du_no_trung_han_tang_rong: number
  target_cap_moi_hmtd: number
  product_values?: Record<string, number>
  product_targets?: Record<string, number>
}

type KpiMetric = { id: string; label: string; unit: string; scale?: number; isProduct?: boolean; actualKey?: keyof KPISummary; targetKey?: keyof KPISummary }

const KPI_METRICS: KpiMetric[] = [
  { id: 'cif_moi', label: 'CIF MỚI', unit: 'KH', actualKey: 'cif_moi', targetKey: 'target_cif_moi' },
  { id: 'bidv_direct', label: 'BIDV DIRECT', unit: 'KH', actualKey: 'bidv_direct', targetKey: 'target_bidv_direct' },
  { id: 'bh_nhan_tho', label: 'BẢO HIỂM NHÂN THỌ', unit: 'Triệu đồng', actualKey: 'bh_nhan_tho', targetKey: 'target_bh_nhan_tho' },
  { id: 'bh_khoan_vay', label: 'BẢO HIỂM KHOẢN VAY', unit: 'Triệu đồng', actualKey: 'bh_khoan_vay', targetKey: 'target_bh_khoan_vay' },
  { id: 'huy_dong_tang_rong', label: 'HUY ĐỘNG VỐN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000, actualKey: 'huy_dong_tang_rong', targetKey: 'target_huy_dong_tang_rong' },
  { id: 'du_no_ngan_han_tang_rong', label: 'DƯ NỢ NGẮN HẠN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000, actualKey: 'du_no_ngan_han_tang_rong', targetKey: 'target_du_no_ngan_han_tang_rong' },
  { id: 'du_no_trung_han_tang_rong', label: 'DƯ NỢ TRUNG/DÀI HẠN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000, actualKey: 'du_no_trung_han_tang_rong', targetKey: 'target_du_no_trung_han_tang_rong' },
  { id: 'cap_moi_hmtd', label: 'CẤP MỚI HMTD (SL KH)', unit: 'KH', actualKey: 'cap_moi_hmtd', targetKey: 'target_cap_moi_hmtd' },
  { id: 'other_spdv', label: 'CÁC SẢN PHẨM KHÁC', unit: 'SL', isProduct: true },
]

export function KPISummaryTable() {
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState<KPISummary[]>([])
  const [monthData, setMonthData] = useState<KPISummary[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const fetchKPI = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = getSupabase()
      const { data: { session } } = await supabase.auth.getSession()

      const [response, monthResponse] = await Promise.all([
        fetch(`/api/reports/kpi-summary?period=${period}`, { headers: { 'Authorization': session ? `Bearer ${session.access_token}` : '' } }),
        period === 'month' ? Promise.resolve(null) : fetch(`/api/reports/kpi-summary?period=month`, { headers: { 'Authorization': session ? `Bearer ${session.access_token}` : '' } })
      ])

      if (!response.ok) throw new Error('Lỗi khi tải dữ liệu KPI')

      const result = await response.json()
      setData(result.data || [])

      if (period === 'month') {
        setMonthData(result.data || [])
      } else if (monthResponse && monthResponse.ok) {
        const monthResult = await monthResponse.json()
        setMonthData(monthResult.data || [])
      }
      setHasLoaded(true)
    } catch (error) {
      logger.error('[KPISummary] Failed to load KPI report', { error: getErrorMessage(error) })
      toast.error('Không thể lấy báo cáo KPI. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }, [period])

  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    setData([])
    setMonthData([])
    setHasLoaded(false)
  }

  const handleDownload = async () => {
    if (!tableRef.current) return
    const element = tableRef.current
    const originalWidth = element.style.width
    const originalOverflows: Array<{ el: HTMLElement; overflow: string; overflowX: string }> = []

    try {
      setIsCapturing(true)

      // Force container width to match the inner table's full scrollWidth
      const tableInner = element.querySelector('table')
      // Padding adjustment
      const fullWidth = tableInner ? tableInner.scrollWidth + 32 : element.scrollWidth
      
      element.style.width = `${fullWidth}px`
      
      // Temporarily remove overflow constraints so html2canvas doesn't crop
      const scrollContainers = element.querySelectorAll('.overflow-x-auto, .overflow-hidden')
      scrollContainers.forEach((node) => {
        const el = node as HTMLElement
        originalOverflows.push({
          el,
          overflow: el.style.overflow,
          overflowX: el.style.overflowX,
        })
        el.style.overflow = 'visible'
        el.style.overflowX = 'visible'
      })

      // Wait for DOM to repaint
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        width: fullWidth,
        windowWidth: fullWidth
      })
      
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `kpi-summary-${period}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = url
      link.click()
    } catch (err) {
      logger.error('[KPISummary] Failed to capture KPI report', { error: getErrorMessage(err) })
      toast.error('Không thể tải ảnh báo cáo KPI.')
    } finally {
      element.style.width = originalWidth
      originalOverflows.forEach(({ el, overflow, overflowX }) => {
        el.style.overflow = overflow
        el.style.overflowX = overflowX
      })
      setIsCapturing(false)
    }
  }

  return (
    <div ref={tableRef} className="bg-white p-2 rounded-xl">
      <Card className="w-full overflow-hidden border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
          <Link href="/reports" className="group flex items-center gap-2">
            <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#006b68] to-[#33b7ab] group-hover:opacity-80 transition-all cursor-pointer flex items-center gap-2">
              KPI ngày
              <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-all">
                Xem chi tiết →
              </span>
            </CardTitle>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchKPI}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#006b68] text-white hover:bg-[#005451] px-3 py-1.5 text-xs font-bold transition-all border border-[#006b68] disabled:opacity-50"
              title="Lấy dữ liệu báo cáo KPI"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Đang lấy...' : 'Lấy báo cáo'}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isCapturing || !hasLoaded}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 text-xs font-bold transition-all border border-slate-200 disabled:opacity-50"
              title="Tải ảnh báo cáo (Webview)"
            >
              <Download className="w-4 h-4" />
              {isCapturing ? 'Đang tải...' : 'Tải ảnh'}
            </button>
            <Link
              href="/kpi-targets"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold transition-all border border-emerald-200"
              title="Phân bổ chỉ tiêu Tháng về Tuần, Ngày"
            >
              Phân bổ chỉ tiêu
            </Link>
            <Select value={period} onValueChange={(val) => val && handlePeriodChange(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Chọn kỳ báo cáo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hôm nay</SelectItem>
                <SelectItem value="week">Tuần này</SelectItem>
                <SelectItem value="month">Tháng này</SelectItem>
                <SelectItem value="quarter">Quý này</SelectItem>
                <SelectItem value="year">Năm nay</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-[800px]">
            {!hasLoaded && !loading ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                <p className="font-semibold text-slate-700">Chưa lấy dữ liệu KPI</p>
                <p>Chọn kỳ báo cáo rồi bấm Lấy báo cáo để tải dữ liệu.</p>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006b68]"></div>
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-[#e6f3f2] border-b-2 border-[#ccedea]">
                    <th className="py-3 px-4 text-left font-semibold text-[#003e3b] w-12 border-r border-[#ccedea]">STT</th>
                    <th className="py-3 px-4 text-left font-semibold text-[#003e3b] min-w-[200px] border-r border-[#ccedea]">HOẠT ĐỘNG/ CHỈ TIÊU</th>
                    <th className="py-3 px-4 text-center font-semibold text-[#003e3b] w-24 border-r border-[#ccedea]">Đơn vị</th>
                    <th className="py-3 px-4 text-center font-semibold text-[#005451] w-28 bg-[#d8efec] border-r border-[#ccedea]">Chỉ tiêu<br/>tháng</th>
                    <th className="py-3 px-4 text-center font-semibold text-[#005451] w-28 bg-[#d8efec] border-r border-[#ccedea]">Kết quả<br/>tháng</th>
                    {data.map((user) => (
                      <th key={user.manager_id} className="py-3 px-4 text-center font-semibold text-[#003e3b] min-w-[120px] border-r border-[#ccedea] whitespace-nowrap">
                        {user.short_name || formatShortName(user.full_name || '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {KPI_METRICS.map((metric, index) => (
                    <tr key={metric.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-500 font-medium border-r border-gray-100">{index + 1}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 border-r border-gray-100">{metric.label}</td>
                      <td className="py-3 px-4 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-r border-gray-100">{metric.unit}</td>
                      
                      {(() => {
                        const formatCell = (val: number | undefined) => {
                          if (!val) return val === 0 ? '-' : '0';
                          const displayValue = metric.scale ? val / metric.scale : val;
                          return new Intl.NumberFormat('vi-VN', {
                            maximumFractionDigits: metric.scale ? 2 : 0,
                          }).format(displayValue);
                        }

                        const monthTotalValue = monthData.reduce((sum, user) => {
                          if (metric.isProduct) return sum + Number(user.product_values?.[metric.id] || 0)
                          return sum + Number(metric.actualKey ? user[metric.actualKey] || 0 : 0)
                        }, 0)
                        const monthTotalTarget = monthData.reduce((sum, user) => {
                          if (metric.isProduct) return sum + Number(user.product_targets?.[metric.id] || 0)
                          return sum + Number(metric.targetKey ? user[metric.targetKey] || 0 : 0)
                        }, 0)

                        return (
                          <>
                            <td className="py-3 px-4 text-center bg-[#f0f8f7] border-r border-[#e0f2f0] text-[#006b68]">
                              <div className="font-bold">{formatCell(monthTotalTarget)}</div>
                            </td>
                            <td className="py-3 px-4 text-center bg-[#f0f8f7] border-r border-gray-100 text-[#006b68]">
                              <div className="font-bold">{formatCell(monthTotalValue)}</div>
                            </td>
                          </>
                        )
                      })()}

                      {data.map((user) => {
                        const value = metric.isProduct ? Number(user.product_values?.[metric.id] || 0) : Number(metric.actualKey ? user[metric.actualKey] || 0 : 0);
                        const target = metric.isProduct ? Number(user.product_targets?.[metric.id] || 0) : Number(metric.targetKey ? user[metric.targetKey] || 0 : 0);

                        const formatCell = (val: number | undefined) => {
                          if (!val) return val === 0 ? '-' : '0';
                          const displayValue = metric.scale ? val / metric.scale : val;
                          return new Intl.NumberFormat('vi-VN', {
                            maximumFractionDigits: metric.scale ? 2 : 0,
                          }).format(displayValue);
                        }

                        const formattedValue = formatCell(value);
                        const formattedTarget = formatCell(target);
                        
                        return (
                          <td key={`${user.manager_id}-${metric.id}`} className="py-3 px-4 text-center border-r border-gray-100 text-slate-700">
                            <div className="font-bold">{formattedValue}</div>
                            <div className="text-[10px] text-slate-400 font-medium">MT: {formattedTarget === '-' ? '0' : formattedTarget}</div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
