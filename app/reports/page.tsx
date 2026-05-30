"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar, Download, Loader2, Users, Building2, User } from "lucide-react"
import { formatMetricNumber, getRecordMetricValue, getRecordUnitLabel } from "@/lib/product-metrics"
import { fetchProfiles, fetchSalesRecords, fetchSalesRecordsByAgent, fetchSalesRecordsByAgents, fetchPlanAssignments, fetchPlans } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"
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

const KPI_FIELDS = [
  { key: 'target_loans_amount', label: 'Chỉ tiêu vay', sourceType: 'LOAN', unit: 'VNĐ' },
  { key: 'target_deposits_amount', label: 'Chỉ tiêu gửi', sourceType: 'DEPOSIT', unit: 'VNĐ' },
  { key: 'target_cif_moi', label: 'CIF mới', sourceType: 'PRODUCT', unit: 'KH' },
  { key: 'target_bidv_direct', label: 'BIDV Direct', sourceType: 'PRODUCT', unit: 'KH' },
  { key: 'target_bh_nhan_tho', label: 'BH nhân thọ', sourceType: 'PRODUCT', unit: 'Triệu' },
  { key: 'target_bh_khoan_vay', label: 'BH khoản vay', sourceType: 'PRODUCT', unit: 'Triệu' },
  { key: 'target_cap_moi_hmtd', label: 'Cấp mới HMTD', sourceType: 'PRODUCT', unit: 'KH' },
]

type ViewMode = 'all' | 'department' | 'user'
type TimeRange = 'month' | 'week' | 'today' | 'quarter' | 'year'

function getDateRange(timeRange: TimeRange) {
  const now = new Date()
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch (timeRange) {
    case 'today':
      return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: endOfToday }
    case 'week': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
      return { start, end: endOfToday }
    }
    case 'month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday }
    case 'quarter': {
      const start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
      return { start, end: endOfToday }
    }
    case 'year':
      return { start: new Date(now.getFullYear(), 0, 1), end: endOfToday }
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfToday }
  }
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>("month")
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL')

  const isAdminL1 = user?.role === 'ADMIN_LEVEL_1'
  const isAdminL2 = user?.role === 'ADMIN_LEVEL_2'
  const isUser = user?.role === 'USER'

  // Fetch user-visible profiles based on role
  const visibleProfiles = useMemo(() => {
    const specialists = profiles.filter(p => p.role === 'USER')
    if (isAdminL1) return specialists
    if (isAdminL2) return specialists.filter(p => p.department_id === user?.department_id)
    // Regular user: only self
    return profiles.filter(p => p.id === user?.id)
  }, [profiles, user, isAdminL1, isAdminL2])

  // Department list for filter (Admin L1 only)
  const departments = useMemo(() => {
    const depts = new Set<string>()
    visibleProfiles.forEach(p => { if (p.department_id) depts.add(p.department_id) })
    return Array.from(depts).sort()
  }, [visibleProfiles])

  // Profiles after department filter
  const departmentFilteredProfiles = useMemo(() => {
    if (!isAdminL1 || selectedDepartment === 'ALL') return visibleProfiles
    return visibleProfiles.filter(p => p.department_id === selectedDepartment)
  }, [visibleProfiles, selectedDepartment, isAdminL1])

  // Final displayed profiles (for table columns)
  const displayProfiles = useMemo(() => {
    if (viewMode === 'user' && selectedUserId !== 'ALL') {
      return departmentFilteredProfiles.filter(p => p.id === selectedUserId)
    }
    return departmentFilteredProfiles
  }, [departmentFilteredProfiles, viewMode, selectedUserId])

  const loadData = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      const [pr, plans] = await Promise.all([
        fetchProfiles(),
        fetchPlans(),
      ])
      setProfiles(pr)

      let sales: any[] = []
      if (isUser) {
        // Regular user only sees own data
        sales = await fetchSalesRecordsByAgent(user.id)
      } else {
        // Admin sees all
        sales = await fetchSalesRecords()
      }
      setSalesRecords(sales)

      // Load current plan assignments for KPI display
      if (plans.length > 0) {
        const currentPlan = plans[0]
        const assigns = await fetchPlanAssignments(currentPlan.id)
        setAssignments(assigns)
      }
    } catch (err) {
      console.error('Reports load error:', err)
    } finally {
      setLoading(false)
    }
  }, [user, isUser])

  useEffect(() => { setMounted(true); loadData() }, [loadData])

  const filteredSales = useMemo(() => {
    const { start, end } = getDateRange(timeRange)

    // First filter by date
    const dateFiltered = salesRecords.filter((sale: any) => {
      const saleDate = new Date(sale.sale_date)
      if (Number.isNaN(saleDate.getTime())) return false
      return saleDate >= start && saleDate <= end
    })

    // Then filter by agent (based on viewMode + selectedUserId)
    if (isUser) {
      return dateFiltered.filter((s: any) => s.agent_id === user?.id)
    }

    const agentIds = displayProfiles.map(p => p.id)
    return dateFiltered.filter((s: any) => agentIds.includes(s.agent_id))
  }, [salesRecords, timeRange, displayProfiles, isUser, user])

  const assignmentMap = useMemo(() => {
    return assignments.reduce<Record<string, any>>((acc, a) => {
      acc[a.user_id] = a
      return acc
    }, {})
  }, [assignments])

  const reportRows = useMemo(() => {
    const rowMap = new Map<string, { key: string; sourceType: string; label: string; unit: string }>()
    filteredSales.forEach((sale: any) => {
      const label = sale.title || sale.category || 'Khác'
      const unit = getRecordUnitLabel(sale)
      const key = `${sale.source_type}:${label}:${unit}`
      if (!rowMap.has(key)) {
        rowMap.set(key, { key, sourceType: sale.source_type, label, unit })
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
      if (sale.agent_id !== agentId || sale.source_type !== row.sourceType || saleLabel !== row.label || getRecordUnitLabel(sale) !== row.unit) {
        return sum
      }
      return sum + getRecordMetricValue(sale)
    }, 0)
  }

  const getKpiTarget = (agentId: string, kpiKey: string) => {
    const assign = assignmentMap[agentId]
    if (!assign) return 0
    return Number(assign[kpiKey] || 0)
  }

  const formatMetric = (value: number) => {
    if (!value) return '-'
    return formatMetricNumber(value)
  }

  const getProgressColor = (actual: number, target: number) => {
    if (!target) return 'text-slate-600'
    const pct = actual / target
    if (pct >= 1) return 'text-emerald-700'
    if (pct >= 0.7) return 'text-amber-600'
    return 'text-rose-600'
  }

  const handleExportExcel = () => {
    const agentNames = displayProfiles.map(p => p.full_name)
    const headers = ['Danh mục', 'Nhóm', 'Đơn vị', ...agentNames, 'Tổng cộng']
    const exportData = reportRows.map((reportRow) => {
      const exportRow: any = {
        'Danh mục': SOURCE_LABELS[reportRow.sourceType] || reportRow.sourceType,
        'Nhóm': reportRow.label,
        'Đơn vị': reportRow.unit,
      }
      let rowTotal = 0
      displayProfiles.forEach((agent) => {
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
    XLSX.writeFile(workbook, `BaoCao_BanHang_${timeRange}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (!mounted) return null

  const timeRangeLabel: Record<TimeRange, string> = {
    today: 'Hôm nay',
    week: 'Tuần này',
    month: 'Tháng này',
    quarter: 'Quý này',
    year: 'Năm nay',
  }

  return (
    <DashboardLayout title="Báo Cáo Tổng Hợp">
      <div className="flex flex-col gap-6">
        {/* Header Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {/* Time range */}
            <div className="relative">
              <select
                className="appearance-none pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 font-medium outline-none"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                aria-label="Chọn khoảng thời gian báo cáo"
              >
                <option value="today">Hôm nay</option>
                <option value="week">Tuần này</option>
                <option value="month">Tháng này</option>
                <option value="quarter">Quý này</option>
                <option value="year">Năm nay</option>
              </select>
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Admin L1: View mode + Department filter */}
            {isAdminL1 && (
              <>
                <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden text-sm font-medium">
                  <button
                    onClick={() => { setViewMode('all'); setSelectedUserId('ALL') }}
                    className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Users className="w-3.5 h-3.5" /> Tất cả
                  </button>
                  <button
                    onClick={() => { setViewMode('department'); setSelectedUserId('ALL') }}
                    className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === 'department' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <Building2 className="w-3.5 h-3.5" /> Theo phòng
                  </button>
                  <button
                    onClick={() => setViewMode('user')}
                    className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === 'user' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <User className="w-3.5 h-3.5" /> Theo user
                  </button>
                </div>

                {(viewMode === 'department' || viewMode === 'user') && (
                  <select
                    className="appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedDepartment}
                    onChange={(e) => { setSelectedDepartment(e.target.value); setSelectedUserId('ALL') }}
                    aria-label="Lọc theo phòng ban"
                  >
                    <option value="ALL">Tất cả phòng</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                )}

                {viewMode === 'user' && (
                  <select
                    className="appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    aria-label="Lọc theo chuyên viên"
                  >
                    <option value="ALL">Tất cả user</option>
                    {departmentFilteredProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                )}
              </>
            )}

            {/* Admin L2: Only user filter */}
            {isAdminL2 && (
              <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden text-sm font-medium">
                <button
                  onClick={() => { setViewMode('all'); setSelectedUserId('ALL') }}
                  className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Building2 className="w-3.5 h-3.5" /> Toàn phòng
                </button>
                <button
                  onClick={() => setViewMode('user')}
                  className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${viewMode === 'user' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <User className="w-3.5 h-3.5" /> Theo user
                </button>
                {viewMode === 'user' && (
                  <select
                    className="appearance-none px-3 py-2 bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none border-l"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    aria-label="Lọc theo chuyên viên trong phòng"
                  >
                    <option value="ALL">Tất cả user</option>
                    {visibleProfiles.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shrink-0"
          >
            <Download className="w-4 h-4" /> Xuất Excel
          </button>
        </div>

        {/* KPI vs Thực tế summary banner */}
        {!isUser && assignments.length > 0 && (
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white">
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-3 font-semibold">
              KPI Kỳ Hiện Tại × Kết Quả {timeRangeLabel[timeRange]} (Lũy Kế)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {KPI_FIELDS.map(kpi => {
                const agentIds = displayProfiles.map(p => p.id)
                const totalKpi = agentIds.reduce((sum, id) => sum + getKpiTarget(id, kpi.key), 0)
                const totalActual = filteredSales
                  .filter((s: any) => agentIds.includes(s.agent_id) && s.source_type === kpi.sourceType)
                  .reduce((sum: number, s: any) => sum + getRecordMetricValue(s), 0)
                const pct = totalKpi > 0 ? Math.round((totalActual / totalKpi) * 100) : null
                return (
                  <div key={kpi.key} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider mb-1">{kpi.label}</p>
                    <p className="text-lg font-bold">{formatMetricNumber(totalActual)}</p>
                    <p className="text-[11px] text-slate-400">/ {formatMetricNumber(totalKpi)} {kpi.unit}</p>
                    {pct !== null && (
                      <div className="mt-1.5 h-1.5 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : pct >= 70 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    )}
                    {pct !== null && <p className={`text-[10px] mt-1 font-semibold ${pct >= 100 ? 'text-emerald-300' : pct >= 70 ? 'text-amber-300' : 'text-rose-300'}`}>{pct}%</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Report Table */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800 tracking-tight">Thống Kê Bán Hàng Theo Cán Bộ</h2>
            <p className="text-xs text-slate-500 mt-1">
              {isUser ? 'Kết quả của bạn' : `Khoản vay và tiền gửi tính theo VNĐ, sản phẩm khác tính theo đơn vị của từng loại.`}
              {' '}Lũy kế: <span className="font-semibold text-emerald-700">{timeRangeLabel[timeRange]}</span>
            </p>
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
                    {displayProfiles.map((agent: any) => (
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
                        {displayProfiles.map((agent: any) => {
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
                    <tr><td colSpan={displayProfiles.length + 4} className="py-12 text-center text-slate-500">Chưa có dữ liệu bán hàng trong khoảng thời gian này.</td></tr>
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
