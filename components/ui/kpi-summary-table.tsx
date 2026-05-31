'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/store/useAuthStore'
import Link from 'next/link'

interface KPISummary {
  manager_id: string
  full_name: string
  cif_moi: number
  bidv_direct: number
  bh_nhan_tho: number
  bh_khoan_vay: number
  huy_dong_tang_rong: number
  du_no_ngan_han_tang_rong: number
  du_no_trung_han_tang_rong: number
  cap_moi_hmtd: number
}

const METRICS = [
  { id: 'cif_moi', label: 'CIF MỚI', unit: 'KH' },
  { id: 'bidv_direct', label: 'BIDV DIRECT', unit: 'KH' },
  { id: 'bh_nhan_tho', label: 'BẢO HIỂM NHÂN THỌ', unit: 'Triệu đồng' },
  { id: 'bh_khoan_vay', label: 'BẢO HIỂM KHOẢN VAY', unit: 'Triệu đồng' },
  { id: 'huy_dong_tang_rong', label: 'HUY ĐỘNG VỐN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000 },
  { id: 'du_no_ngan_han_tang_rong', label: 'DƯ NỢ NGẮN HẠN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000 },
  { id: 'du_no_trung_han_tang_rong', label: 'DƯ NỢ TRUNG/DÀI HẠN TĂNG RÒNG', unit: 'Tỷ đồng', scale: 1_000_000_000 },
  { id: 'cap_moi_hmtd', label: 'CẤP MỚI HMTD (SL KH)', unit: 'KH' },
]

export function KPISummaryTable() {
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState<KPISummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPI = async () => {
      setLoading(true)
      try {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        
        const response = await fetch(`/api/reports/kpi-summary?period=${period}`, {
          headers: {
            'Authorization': session ? `Bearer ${session.access_token}` : ''
          }
        })
        
        if (!response.ok) throw new Error('Lỗi khi tải dữ liệu KPI')
        
        const result = await response.json()
        setData(result.data || [])
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchKPI()
  }, [period])

  return (
    <Card className="w-full overflow-hidden border-none shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Link href="/reports" className="group flex items-center gap-2">
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#006b68] to-[#33b7ab] group-hover:opacity-80 transition-all cursor-pointer flex items-center gap-2">
            KPI ngày
            <span className="text-xs font-bold text-teal-600 bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-all">
              Xem chi tiết →
            </span>
          </CardTitle>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/kpi-targets"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold transition-all border border-emerald-200"
            title="Phân bổ chỉ tiêu Tháng về Tuần, Ngày"
          >
            Phân bổ chỉ tiêu
          </Link>
          <Select value={period} onValueChange={(val) => val && setPeriod(val)}>
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
          {loading ? (
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
                  {data.map((user) => (
                    <th key={user.manager_id} className="py-3 px-4 text-center font-semibold text-[#003e3b] min-w-[120px] border-r border-[#ccedea] whitespace-nowrap">
                      {user.full_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {METRICS.map((metric, index) => (
                  <tr key={metric.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-500 font-medium border-r border-gray-100">{index + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 border-r border-gray-100">{metric.label}</td>
                    <td className="py-3 px-4 text-center text-xs font-semibold text-slate-500 bg-slate-50 border-r border-gray-100">{metric.unit}</td>
                    {data.map((user) => {
                      const value = user[metric.id as keyof typeof user] as number;
                      const targetKey = `target_${metric.id}`;
                      const target = user[targetKey as keyof typeof user] as number | undefined;

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
  )
}
