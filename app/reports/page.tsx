"use client"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar, Download, Loader2, Users, Building2, User, Target, TrendingUp, CalendarDays, Sparkles, CheckCircle2 } from "lucide-react"
import { getSupabase } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/useAuthStore"
import * as XLSX from 'xlsx'
import clsx from "clsx"
import { toast } from "sonner"

const KPI_METRICS = [
  { key: 'target_loans_amount', label: 'Chỉ tiêu cho vay', unit: 'VNĐ', type: 'currency' },
  { key: 'target_deposits_amount', label: 'Chỉ tiêu huy động', unit: 'VNĐ', type: 'currency' },
  { key: 'target_calls', label: 'Chỉ tiêu gọi điện', unit: 'Cuộc', type: 'number' },
  { key: 'target_cif_moi', label: 'CIF mới phát triển', unit: 'KH', type: 'number' },
  { key: 'target_bidv_direct', label: 'Đăng ký BIDV Direct', unit: 'KH', type: 'number' },
  { key: 'target_bh_nhan_tho', label: 'Bảo hiểm nhân thọ (Life)', unit: 'Triệu', type: 'number' },
  { key: 'target_bh_khoan_vay', label: 'Bảo hiểm khoản vay (Non-Life)', unit: 'Triệu', type: 'number' },
  { key: 'target_cap_moi_hmtd', label: 'Cấp mới hạn mức tín dụng', unit: 'KH', type: 'number' },
  { key: 'target_huy_dong_tang_rong', label: 'Huy động vốn tăng ròng', unit: 'VNĐ', type: 'currency' },
  { key: 'target_du_no_ngan_han_tang_rong', label: 'Dư nợ ngắn hạn tăng ròng', unit: 'VNĐ', type: 'currency' },
  { key: 'target_du_no_trung_han_tang_rong', label: 'Dư nợ trung/dài hạn tăng ròng', unit: 'VNĐ', type: 'currency' },
]

type ViewMode = 'all' | 'department' | 'user'

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Data States
  const [profiles, setProfiles] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [loans, setLoans] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [crossSellRecords, setCrossSellRecords] = useState<any[]>([])
  const [interactions, setInteractions] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [weeklyPlans, setWeeklyPlans] = useState<any[]>([])
  const [dailyPlans, setDailyPlans] = useState<any[]>([])
  const [snapshots, setSnapshots] = useState<any[]>([])

  // Date States
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10))

  // Filter States
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedUserId, setSelectedUserId] = useState<string>('ALL')

  const isAdminL1 = user?.role === 'ADMIN_LEVEL_1'
  const isAdminL2 = user?.role === 'ADMIN_LEVEL_2'
  const isUser = user?.role === 'USER'

  // Helper date calculators
  const getMondayOfDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const mon = new Date(d.setDate(diff))
    const y = mon.getFullYear()
    const m = String(mon.getMonth() + 1).padStart(2, '0')
    const dayVal = String(mon.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayVal}`
  }, [])

  const getFridayOfDate = useCallback((dateStr: string) => {
    const mon = new Date(getMondayOfDate(dateStr))
    const fri = new Date(mon)
    fri.setDate(mon.getDate() + 4)
    const y = fri.getFullYear()
    const m = String(fri.getMonth() + 1).padStart(2, '0')
    const dayVal = String(fri.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayVal}`
  }, [getMondayOfDate])

  const getStartOfMonth = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}-01`
  }, [])

  const getEndOfMonth = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const y = lastDay.getFullYear()
    const m = String(lastDay.getMonth() + 1).padStart(2, '0')
    const dayVal = String(lastDay.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayVal}`
  }, [])

  // Computed Date Ranges
  const selectedMonday = useMemo(() => getMondayOfDate(reportDate), [reportDate, getMondayOfDate])
  const selectedFriday = useMemo(() => getFridayOfDate(reportDate), [reportDate, getFridayOfDate])
  const selectedMonthStart = useMemo(() => getStartOfMonth(reportDate), [reportDate, getStartOfMonth])
  const selectedMonthEnd = useMemo(() => getEndOfMonth(reportDate), [reportDate, getEndOfMonth])

  // Get active monthly plan
  const activeMonthPlan = useMemo(() => {
    const selDate = new Date(reportDate)
    return plans.find(p => {
      const pDate = new Date(p.target_date)
      return pDate.getFullYear() === selDate.getFullYear() && pDate.getMonth() === selDate.getMonth()
    })
  }, [plans, reportDate])

  // Load All data once
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = getSupabase()
      
      const [
        profilesData,
        plansData,
        assignmentsData,
        loansData,
        depositsData,
        productsData,
        interactionsData,
        customersData,
        weeklyPlansData,
        dailyPlansData,
        snapshotsData,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('is_active', true),
        supabase.from('plans').select('*').order('target_date', { ascending: false }),
        supabase.from('plan_assignments').select('*'),
        supabase.from('loans').select('*').eq('status', 'ACTIVE'),
        supabase.from('deposits').select('*').eq('status', 'ACTIVE'),
        supabase.from('cross_sell_records').select('*, cross_sell_products(*)').eq('status', 'COMPLETED'),
        supabase.from('interactions').select('*'),
        supabase.from('customers').select('*').is('deleted_at', null),
        supabase.from('weekly_plans').select('*'),
        supabase.from('daily_plans').select('*'),
        supabase.from('daily_manager_snapshots').select('*'),
      ])

      if (profilesData.data) setProfiles(profilesData.data)
      if (plansData.data) setPlans(plansData.data)
      if (assignmentsData.data) setAssignments(assignmentsData.data)
      if (loansData.data) setLoans(loansData.data)
      if (depositsData.data) setDeposits(depositsData.data)
      if (productsData.data) setCrossSellRecords(productsData.data)
      if (interactionsData.data) setInteractions(interactionsData.data)
      if (customersData.data) setCustomers(customersData.data)
      if (weeklyPlansData.data) setWeeklyPlans(weeklyPlansData.data)
      if (dailyPlansData.data) setDailyPlans(dailyPlansData.data)
      if (snapshotsData.data) setSnapshots(snapshotsData.data)
    } catch (err: any) {
      toast.error("Lỗi tải dữ liệu báo cáo: " + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    loadData()
  }, [loadData])

  // Filtered Users List
  const visibleProfiles = useMemo(() => {
    const specialists = profiles.filter(p => p.role === 'USER')
    if (isAdminL1) return specialists
    if (isAdminL2) return specialists.filter(p => p.department_id === user?.department_id)
    return specialists.filter(p => p.id === user?.id)
  }, [profiles, user, isAdminL1, isAdminL2])

  // Departments list for filters
  const departments = useMemo(() => {
    const depts = new Set<string>()
    visibleProfiles.forEach(p => { if (p.department_id) depts.add(p.department_id) })
    return Array.from(depts).sort()
  }, [visibleProfiles])

  // Scope user ids list based on filters
  const targetUserIds = useMemo(() => {
    const specialists = profiles.filter(p => p.role === 'USER')
    
    if (isUser) {
      return [user?.id || '']
    }
    
    if (isAdminL2) {
      const deptSpecialists = specialists.filter(p => p.department_id === user?.department_id)
      if (viewMode === 'all') {
        return deptSpecialists.map(p => p.id)
      } else {
        return selectedUserId === 'ALL' ? deptSpecialists.map(p => p.id) : [selectedUserId]
      }
    }
    
    // Admin L1
    if (viewMode === 'all') {
      return specialists.map(p => p.id)
    } else if (viewMode === 'department') {
      const deptSpecialists = selectedDepartment === 'ALL' 
        ? specialists 
        : specialists.filter(p => p.department_id === selectedDepartment)
      return deptSpecialists.map(p => p.id)
    } else {
      // viewMode === 'user'
      const deptSpecialists = selectedDepartment === 'ALL'
        ? specialists
        : specialists.filter(p => p.department_id === selectedDepartment)
      return selectedUserId === 'ALL' 
        ? deptSpecialists.map(p => p.id) 
        : [selectedUserId]
    }
  }, [profiles, user, isUser, isAdminL2, viewMode, selectedDepartment, selectedUserId])

  // Helper to calculate Net Growth actual from snapshots
  const getNetGrowthActual = useCallback((metricType: 'deposit' | 'short_loan' | 'medium_loan', userIds: string[], startDateStr: string, endDateStr: string) => {
    let total = 0
    userIds.forEach(uId => {
      const userSnaps = snapshots.filter(s => s.manager_id === uId)
      if (userSnaps.length === 0) return

      const sorted = [...userSnaps].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))

      // Find closest snapshot on or before endDateStr
      const endSnap = sorted.filter(s => s.snapshot_date <= endDateStr).pop()
      const endVal = endSnap ? (
        metricType === 'deposit' ? Number(endSnap.total_deposit_balance || 0) :
        metricType === 'short_loan' ? Number(endSnap.total_short_term_loan_balance || 0) :
        Number(endSnap.total_medium_term_loan_balance || 0)
      ) : 0

      // Find closest snapshot on or before startDateStr
      const startSnap = sorted.filter(s => s.snapshot_date <= startDateStr).pop()
      const startVal = startSnap ? (
        metricType === 'deposit' ? Number(startSnap.total_deposit_balance || 0) :
        metricType === 'short_loan' ? Number(startSnap.total_short_term_loan_balance || 0) :
        Number(startSnap.total_medium_term_loan_balance || 0)
      ) : 0

      total += (endVal - startVal)
    })
    return total
  }, [snapshots])

  // Helper to calculate aggregated Target values
  const getTargetValue = useCallback((fieldKey: string, level: 'month' | 'week' | 'day') => {
    if (targetUserIds.length === 0) return 0

    if (level === 'month') {
      if (!activeMonthPlan) return 0
      const activeAssigns = assignments.filter(a => a.plan_id === activeMonthPlan.id && targetUserIds.includes(a.user_id))
      return activeAssigns.reduce((sum, a) => sum + Number(a[fieldKey] || 0), 0)
    }

    if (level === 'week') {
      const activeWeekPlans = weeklyPlans.filter(wp => wp.start_date === selectedMonday && targetUserIds.includes(wp.user_id))
      return activeWeekPlans.reduce((sum, wp) => sum + Number(wp[fieldKey] || 0), 0)
    }

    // level === 'day'
    const activeDailyPlans = dailyPlans.filter(dp => dp.target_date === reportDate && targetUserIds.includes(dp.user_id))
    return activeDailyPlans.reduce((sum, dp) => sum + Number(dp[fieldKey] || 0), 0)
  }, [targetUserIds, activeMonthPlan, assignments, weeklyPlans, selectedMonday, dailyPlans, reportDate])

  // Helper to calculate aggregated Actual values
  const getActualValue = useCallback((fieldKey: string, startDateStr: string, endDateStr: string) => {
    if (targetUserIds.length === 0) return 0

    // 1. Loans amount
    if (fieldKey === 'target_loans_amount') {
      const filteredLoans = loans.filter(l => 
        l.start_date >= startDateStr && 
        l.start_date <= endDateStr && 
        l.customer_id && 
        customers.some(c => c.id === l.customer_id && targetUserIds.includes(c.assigned_manager_id))
      )
      return filteredLoans.reduce((sum, l) => sum + Number(l.amount || 0), 0)
    }

    // 2. Deposits amount
    if (fieldKey === 'target_deposits_amount') {
      const filteredDeposits = deposits.filter(d => 
        d.start_date >= startDateStr && 
        d.start_date <= endDateStr && 
        d.customer_id && 
        customers.some(c => c.id === d.customer_id && targetUserIds.includes(c.assigned_manager_id))
      )
      return filteredDeposits.reduce((sum, d) => sum + Number(d.amount || 0), 0)
    }

    // 3. Calls count
    if (fieldKey === 'target_calls') {
      const filteredInteractions = interactions.filter(i => 
        i.type === 'CALL' && 
        i.interaction_date >= startDateStr && 
        i.interaction_date <= endDateStr && 
        targetUserIds.includes(i.manager_id)
      )
      return filteredInteractions.length
    }

    // 4. CIF mới count
    if (fieldKey === 'target_cif_moi') {
      const filteredCustomers = customers.filter(c => {
        const cDate = c.created_at ? c.created_at.slice(0, 10) : ''
        return cDate >= startDateStr && cDate <= endDateStr && targetUserIds.includes(c.assigned_manager_id)
      })
      return filteredCustomers.length
    }

    // 5. Product metrics (BIDV Direct, BH nhân thọ, BH khoản vay, Cấp mới HMTD)
    const productKeys = ['target_bidv_direct', 'target_bh_nhan_tho', 'target_bh_khoan_vay', 'target_cap_moi_hmtd']

    if (productKeys.includes(fieldKey)) {
      const filteredSales = crossSellRecords.filter(s => {
        const sDate = s.sale_date || (s.created_at ? s.created_at.slice(0, 10) : '')
        const pName = s.cross_sell_products?.name || ''
        const nameUpper = pName.toUpperCase()
        
        let isMatch = false
        if (fieldKey === 'target_bidv_direct') isMatch = nameUpper.includes("DIRECT")
        else if (fieldKey === 'target_bh_nhan_tho') isMatch = nameUpper.includes("NHÂN THỌ") || nameUpper.includes("LIFE")
        else if (fieldKey === 'target_bh_khoan_vay') isMatch = nameUpper.includes("KHOẢN VAY") || nameUpper.includes("NON-LIFE")
        else if (fieldKey === 'target_cap_moi_hmtd') isMatch = nameUpper.includes("HMTD")

        return (
          isMatch &&
          sDate >= startDateStr &&
          sDate <= endDateStr &&
          targetUserIds.includes(s.agent_id)
        )
      })

      if (fieldKey === 'target_bidv_direct' || fieldKey === 'target_cap_moi_hmtd') {
        return filteredSales.length
      } else {
        // BH nhân thọ and BH khoản vay are numeric amounts (triệu đồng)
        return filteredSales.reduce((sum, s) => sum + Number(s.result_value || 0), 0)
      }
    }

    // 6. Net growth metrics using snapshots
    if (fieldKey === 'target_huy_dong_tang_rong') {
      return getNetGrowthActual('deposit', targetUserIds, startDateStr, endDateStr)
    }
    if (fieldKey === 'target_du_no_ngan_han_tang_rong') {
      return getNetGrowthActual('short_loan', targetUserIds, startDateStr, endDateStr)
    }
    if (fieldKey === 'target_du_no_trung_han_tang_rong') {
      return getNetGrowthActual('medium_loan', targetUserIds, startDateStr, endDateStr)
    }

    return 0
  }, [targetUserIds, loans, deposits, crossSellRecords, interactions, customers, getNetGrowthActual])

  // Helper values
  const getPercent = (actual: number, target: number) => {
    if (target <= 0) return null
    return Math.round((actual / target) * 100)
  }

  const getPercentColorClass = (pct: number | null) => {
    if (pct === null) return 'text-slate-400 font-medium'
    if (pct >= 100) return 'text-[#006b68] font-bold'
    if (pct >= 70) return 'text-amber-600 font-bold'
    return 'text-rose-600 font-bold'
  }

  const formatValue = (value: number, type: string) => {
    if (value === 0) return '-'
    if (type === 'currency') {
      const absVal = Math.abs(value)
      if (absVal >= 1000000000) {
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1000000000) + ' Tỷ'
      }
      if (absVal >= 1000000) {
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value / 1000000) + ' Triệu'
      }
      return new Intl.NumberFormat('vi-VN').format(value)
    }
    return new Intl.NumberFormat('vi-VN').format(value)
  }

  const handleExportExcel = () => {
    const exportData = KPI_METRICS.map(kpi => {
      const mTarget = getTargetValue(kpi.key, 'month')
      const mActual = getActualValue(kpi.key, selectedMonthStart, selectedMonthEnd)
      const mPct = getPercent(mActual, mTarget)
      
      const wTarget = getTargetValue(kpi.key, 'week')
      const wActual = getActualValue(kpi.key, selectedMonday, selectedFriday)
      const wPct = getPercent(wActual, wTarget)
      
      const dTarget = getTargetValue(kpi.key, 'day')
      const dActual = getActualValue(kpi.key, reportDate, reportDate)
      const dPct = getPercent(dActual, dTarget)

      return {
        'Chỉ tiêu': kpi.label,
        'Đơn vị': kpi.unit,
        'Chỉ tiêu Tháng': mTarget,
        'Thực tế Tháng': mActual,
        'Hoàn thành Tháng (%)': mPct !== null ? `${mPct}%` : '-',
        'Chỉ tiêu Tuần': wTarget,
        'Thực tế Tuần': wActual,
        'Hoàn thành Tuần (%)': wPct !== null ? `${wPct}%` : '-',
        'Chỉ tiêu Ngày': dTarget,
        'Kết quả Ngày': dActual,
        'Hoàn thành Ngày (%)': dPct !== null ? `${dPct}%` : '-',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoKPI")
    XLSX.writeFile(workbook, `BaoCao_KPISummary_${reportDate}.xlsx`)
    toast.success("Xuất file báo cáo Excel thành công!")
  }

  // Calculate average completion percentages for top summary
  const summaryMetrics = useMemo(() => {
    let mSum = 0, mCount = 0
    let wSum = 0, wCount = 0
    let dSum = 0, dCount = 0

    KPI_METRICS.forEach(kpi => {
      const mTarget = getTargetValue(kpi.key, 'month')
      if (mTarget > 0) {
        const mActual = getActualValue(kpi.key, selectedMonthStart, selectedMonthEnd)
        mSum += Math.min((mActual / mTarget) * 100, 100)
        mCount++
      }

      const wTarget = getTargetValue(kpi.key, 'week')
      if (wTarget > 0) {
        const wActual = getActualValue(kpi.key, selectedMonday, selectedFriday)
        wSum += Math.min((wActual / wTarget) * 100, 100)
        wCount++
      }

      const dTarget = getTargetValue(kpi.key, 'day')
      if (dTarget > 0) {
        const dActual = getActualValue(kpi.key, reportDate, reportDate)
        dSum += Math.min((dActual / dTarget) * 100, 100)
        dCount++
      }
    })

    return {
      monthAvg: mCount > 0 ? Math.round(mSum / mCount) : 0,
      weekAvg: wCount > 0 ? Math.round(wSum / wCount) : 0,
      dayAvg: dCount > 0 ? Math.round(dSum / dCount) : 0,
    }
  }, [getTargetValue, getActualValue, selectedMonthStart, selectedMonthEnd, selectedMonday, selectedFriday, reportDate])

  const reportTitleScope = useMemo(() => {
    if (isUser) return `Chuyên viên: ${user?.full_name}`
    if (isAdminL2) {
      if (viewMode === 'all') return `Phòng: ${user?.department_id || 'Chưa phân phòng'}`
      const targetUser = profiles.find(p => p.id === selectedUserId)
      return targetUser ? `Chuyên viên: ${targetUser.full_name}` : 'Cấp phòng'
    }
    // Admin L1
    if (viewMode === 'all') return 'Toàn bộ Chi nhánh'
    if (viewMode === 'department') return `Phòng: ${selectedDepartment}`
    const targetUser = profiles.find(p => p.id === selectedUserId)
    return targetUser ? `Chuyên viên: ${targetUser.full_name}` : 'Chi nhánh'
  }, [isUser, isAdminL2, viewMode, selectedUserId, selectedDepartment, user, profiles])

  if (!mounted) return null

  return (
    <DashboardLayout title="Báo Cáo Tổng Hợp">
      <div className="flex flex-col gap-6">
        
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-xl border border-[#003e3b]/30 bg-[radial-gradient(circle_at_top_left,_rgba(51,183,171,0.2),_transparent_35%),linear-gradient(135deg,_#002b29_0%,_#004d4a_50%,_#006b68_100%)] p-6 text-white shadow-lg md:p-8">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                Động Lực Phát Triển Chi Nhánh
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Báo Cáo Tổng Hợp KPI & Kết Quả</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300">
                  Đối chiếu chỉ tiêu được giao và kết quả thực hiện lũy kế cấp <span className="text-emerald-300 font-semibold">Tháng</span>, <span className="text-emerald-300 font-semibold">Tuần</span>, và <span className="text-emerald-300 font-semibold">Ngày</span>.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                href="/kpi-targets"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-4 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:bg-emerald-500/30 backdrop-blur-md"
              >
                <Target className="h-4 w-4" />
                Phân bổ chỉ tiêu
              </Link>
              <button
                onClick={handleExportExcel}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-md transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Download className="h-4 w-4 text-[#006b68]" />
                Xuất Excel
              </button>
            </div>
          </div>
        </section>

        {/* Date Selector & Filters Card */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
            
            {/* Date Pickers */}
            <div className="lg:col-span-4 space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Ngày xem báo cáo</label>
              <div className="relative">
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => e.target.value && setReportDate(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#006b68] outline-none transition-all"
                />
              </div>
            </div>

            {/* Range Info Cards */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kỳ Tháng</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {new Date(selectedMonthStart).toLocaleDateString('vi-VN')} - {new Date(selectedMonthEnd).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kỳ Tuần (T2-T6)</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {new Date(selectedMonday).toLocaleDateString('vi-VN')} - {new Date(selectedFriday).toLocaleDateString('vi-VN')}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Kỳ Ngày</p>
                <p className="text-xs font-bold text-slate-700 mt-1">
                  {new Date(reportDate).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>

          {/* Filtering row for Admin L1 / L2 */}
          {!isUser && (
            <div className="border-t border-slate-100 mt-5 pt-4 flex flex-wrap gap-4 items-center">
              
              {/* Admin L1 Filters */}
              {isAdminL1 && (
                <>
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                    <button
                      onClick={() => { setViewMode('all'); setSelectedUserId('ALL') }}
                      className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors", viewMode === 'all' ? 'bg-[#006b68] text-white' : 'text-slate-600 hover:bg-white/50')}
                    >
                      <Users className="w-3.5 h-3.5" /> Toàn chi nhánh
                    </button>
                    <button
                      onClick={() => { setViewMode('department'); setSelectedUserId('ALL') }}
                      className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors", viewMode === 'department' ? 'bg-[#006b68] text-white' : 'text-slate-600 hover:bg-white/50')}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Theo phòng ban
                    </button>
                    <button
                      onClick={() => setViewMode('user')}
                      className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors", viewMode === 'user' ? 'bg-[#006b68] text-white' : 'text-slate-600 hover:bg-white/50')}
                    >
                      <User className="w-3.5 h-3.5" /> Theo chuyên viên
                    </button>
                  </div>

                  {(viewMode === 'department' || viewMode === 'user') && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006b68] outline-none"
                        value={selectedDepartment}
                        onChange={(e) => { setSelectedDepartment(e.target.value); setSelectedUserId('ALL') }}
                        aria-label="Chọn phòng ban để lọc"
                      >
                        <option value="ALL">Tất cả phòng</option>
                        {departments.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {viewMode === 'user' && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006b68] outline-none"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        aria-label="Chọn chuyên viên để lọc"
                      >
                        <option value="ALL">Tất cả cán bộ</option>
                        {profiles.filter(p => p.role === 'USER' && (selectedDepartment === 'ALL' || p.department_id === selectedDepartment)).map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              {/* Admin L2 Filters */}
              {isAdminL2 && (
                <>
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                    <button
                      onClick={() => { setViewMode('all'); setSelectedUserId('ALL') }}
                      className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors", viewMode === 'all' ? 'bg-[#006b68] text-white' : 'text-slate-600 hover:bg-white/50')}
                    >
                      <Building2 className="w-3.5 h-3.5" /> Tổng hợp phòng
                    </button>
                    <button
                      onClick={() => setViewMode('user')}
                      className={clsx("flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-colors", viewMode === 'user' ? 'bg-[#006b68] text-white' : 'text-slate-600 hover:bg-white/50')}
                    >
                      <User className="w-3.5 h-3.5" /> Theo chuyên viên
                    </button>
                  </div>

                  {viewMode === 'user' && (
                    <div className="flex flex-col gap-1">
                      <select
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#006b68] outline-none"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        aria-label="Chọn chuyên viên trong phòng"
                      >
                        <option value="ALL">Tất cả cán bộ phòng</option>
                        {visibleProfiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="ml-auto text-xs font-bold text-slate-400 italic">
                Bộ lọc: {reportTitleScope}
              </div>
            </div>
          )}
        </section>

        {/* Core Stats Progress Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Month progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiến độ bình quân Tháng</p>
              <h3 className="text-2xl font-black text-slate-800">{summaryMetrics.monthAvg}%</h3>
              <p className="text-[10px] text-[#006b68] font-bold">Kỳ hạn: 30 ngày</p>
            </div>
            <div className="h-16 w-16 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#006b68]" strokeDasharray={`${summaryMetrics.monthAvg}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#006b68]">{summaryMetrics.monthAvg}%</div>
            </div>
          </div>

          {/* Week progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiến độ bình quân Tuần</p>
              <h3 className="text-2xl font-black text-slate-800">{summaryMetrics.weekAvg}%</h3>
              <p className="text-[10px] text-[#006b68] font-bold">Kỳ hạn: Thứ 2 - Thứ 6</p>
            </div>
            <div className="h-16 w-16 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#006b68]" strokeDasharray={`${summaryMetrics.weekAvg}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#006b68]">{summaryMetrics.weekAvg}%</div>
            </div>
          </div>

          {/* Day progress */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiến độ bình quân Ngày</p>
              <h3 className="text-2xl font-black text-slate-800">{summaryMetrics.dayAvg}%</h3>
              <p className="text-[10px] text-[#006b68] font-bold">Ngày xem: {new Date(reportDate).toLocaleDateString('vi-VN')}</p>
            </div>
            <div className="h-16 w-16 relative">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-[#006b68]" strokeDasharray={`${summaryMetrics.dayAvg}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-[#006b68]">{summaryMetrics.dayAvg}%</div>
            </div>
          </div>

        </section>

        {/* 3-Level Core Summary Report Table */}
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-md">
          <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Báo cáo chỉ tiêu KPI liên thông 3 Cấp</h3>
              <p className="mt-1 text-xs text-slate-500">
                Hiển thị song hành chỉ tiêu và kết quả thực tế của kỳ hạn Tháng (Lũy kế), Tuần (Lũy kế T2-T6) và Ngày đã chọn.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 items-center">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {targetUserIds.length} Chuyên viên
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#006b68]">
                {KPI_METRICS.length} Chỉ tiêu sản phẩm
              </span>
              <button
                onClick={handleExportExcel}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200/50 px-3 py-1.5 text-xs font-bold text-[#006b68] shadow-sm transition-all disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                Tải báo cáo Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-[#006b68]" />
              <span className="ml-3 text-slate-500 text-sm font-semibold">Đang truy vấn dữ liệu...</span>
            </div>
          ) : (
            <>
              {/* Desktop View (Table) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[1400px]">
                  <thead>
                    <tr className="border-b border-[#002625]">
                      <th rowSpan={2} className="sticky left-0 z-20 min-w-[240px] bg-[#002625] px-4 py-4 text-xs font-semibold uppercase tracking-wider text-white border-r border-[#001b1a]">
                        Danh mục chỉ tiêu
                      </th>
                      <th rowSpan={2} className="text-center w-24 bg-[#002625] px-2 py-4 text-xs font-semibold uppercase tracking-wider text-white border-r border-[#001b1a]">
                        Đơn vị
                      </th>
                      <th colSpan={3} className="text-center bg-[#003835] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-teal-50 border-r border-[#002b29]">
                        Cấp Tháng
                      </th>
                      <th colSpan={3} className="text-center bg-[#004d4a] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-teal-100 border-r border-[#003e3b]">
                        Cấp Tuần (Thứ 2 - Thứ 6)
                      </th>
                      <th colSpan={3} className="text-center bg-[#005c58] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-teal-50">
                        Cấp Ngày
                      </th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {/* Month columns */}
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-teal-50/30">Chỉ tiêu</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-teal-50/30">Lũy kế</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 bg-teal-50/50 border-r border-slate-200">% Đạt</th>
                      
                      {/* Week columns */}
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-emerald-50/10">Chỉ tiêu</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-emerald-50/10">Lũy kế</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 bg-emerald-50/30 border-r border-slate-200">% Đạt</th>
                      
                      {/* Day columns */}
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-slate-50">Chỉ tiêu</th>
                      <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 bg-slate-50">Thực tế</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 bg-slate-100">% Đạt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {KPI_METRICS.map((kpi, idx) => {
                      // Month calculations
                      const mTarget = getTargetValue(kpi.key, 'month')
                      const mActual = getActualValue(kpi.key, selectedMonthStart, selectedMonthEnd)
                      const mPct = getPercent(mActual, mTarget)

                      // Week calculations
                      const wTarget = getTargetValue(kpi.key, 'week')
                      const wActual = getActualValue(kpi.key, selectedMonday, selectedFriday)
                      const wPct = getPercent(wActual, wTarget)

                      // Day calculations
                      const dTarget = getTargetValue(kpi.key, 'day')
                      const dActual = getActualValue(kpi.key, reportDate, reportDate)
                      const dPct = getPercent(dActual, dTarget)

                      const isEven = idx % 2 === 0
                      const rowBg = isEven ? "bg-white" : "bg-slate-50/40"

                      return (
                        <tr key={kpi.key} className={clsx("hover:bg-slate-50 transition-colors", rowBg)}>
                          <td className="sticky left-0 z-10 font-semibold text-slate-800 text-sm px-4 py-3 border-r border-slate-100 bg-white shadow-[1px_0_0_0_#f1f5f9]">
                            {kpi.label}
                          </td>
                          <td className="text-center text-xs font-bold text-slate-500 px-2 py-3 bg-slate-50 border-r border-slate-200">
                            {kpi.unit}
                          </td>
                          
                          {/* Month Data Cells */}
                          <td className="px-3 py-3 text-right font-medium text-slate-600 bg-teal-50/10">
                            {formatValue(mTarget, kpi.type)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 bg-teal-50/10">
                            {formatValue(mActual, kpi.type)}
                          </td>
                          <td className={clsx("px-3 py-3 text-center border-r border-slate-200 bg-teal-50/20", getPercentColorClass(mPct))}>
                            {mPct !== null ? `${mPct}%` : '-'}
                          </td>

                          {/* Week Data Cells */}
                          <td className="px-3 py-3 text-right font-medium text-slate-600 bg-emerald-50/5">
                            {formatValue(wTarget, kpi.type)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800 bg-emerald-50/5">
                            {formatValue(wActual, kpi.type)}
                          </td>
                          <td className={clsx("px-3 py-3 text-center border-r border-slate-200 bg-emerald-50/10", getPercentColorClass(wPct))}>
                            {wPct !== null ? `${wPct}%` : '-'}
                          </td>

                          {/* Day Data Cells */}
                          <td className="px-3 py-3 text-right font-medium text-slate-600">
                            {formatValue(dTarget, kpi.type)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-800">
                            {formatValue(dActual, kpi.type)}
                          </td>
                          <td className={clsx("px-3 py-3 text-center bg-slate-50", getPercentColorClass(dPct))}>
                            {dPct !== null ? `${dPct}%` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View (Responsive Cards List) */}
              <div className="block md:hidden divide-y divide-slate-100 bg-white">
                {KPI_METRICS.map((kpi) => {
                  // Month calculations
                  const mTarget = getTargetValue(kpi.key, 'month')
                  const mActual = getActualValue(kpi.key, selectedMonthStart, selectedMonthEnd)
                  const mPct = getPercent(mActual, mTarget)

                  // Week calculations
                  const wTarget = getTargetValue(kpi.key, 'week')
                  const wActual = getActualValue(kpi.key, selectedMonday, selectedFriday)
                  const wPct = getPercent(wActual, wTarget)

                  // Day calculations
                  const dTarget = getTargetValue(kpi.key, 'day')
                  const dActual = getActualValue(kpi.key, reportDate, reportDate)
                  const dPct = getPercent(dActual, dTarget)

                  return (
                    <div key={kpi.key} className="p-4 space-y-3 hover:bg-slate-50/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[13px]">{kpi.label}</span>
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 uppercase">
                          {kpi.unit}
                        </span>
                      </div>

                      {/* 3 levels mobile view */}
                      <div className="grid grid-cols-3 gap-2">
                        {/* Month */}
                        <div className="p-2 rounded-xl border border-teal-100/40 bg-teal-50/10 flex flex-col justify-between text-center">
                          <p className="text-[9px] font-bold text-[#006b68] uppercase tracking-wider mb-1">Tháng</p>
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-slate-400">Tiêu: <span className="font-semibold text-slate-600">{formatValue(mTarget, kpi.type)}</span></p>
                            <p className="text-slate-400">Lũy: <span className="font-bold text-slate-700">{formatValue(mActual, kpi.type)}</span></p>
                            <p className={clsx("font-bold text-xs mt-1", getPercentColorClass(mPct))}>
                              {mPct !== null ? `${mPct}%` : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Week */}
                        <div className="p-2 rounded-xl border border-emerald-100/40 bg-emerald-50/10 flex flex-col justify-between text-center">
                          <p className="text-[9px] font-bold text-[#005451] uppercase tracking-wider mb-1">Tuần</p>
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-slate-400">Tiêu: <span className="font-semibold text-slate-600">{formatValue(wTarget, kpi.type)}</span></p>
                            <p className="text-slate-400">Lũy: <span className="font-bold text-slate-700">{formatValue(wActual, kpi.type)}</span></p>
                            <p className={clsx("font-bold text-xs mt-1", getPercentColorClass(wPct))}>
                              {wPct !== null ? `${wPct}%` : '-'}
                            </p>
                          </div>
                        </div>

                        {/* Day */}
                        <div className="p-2 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between text-center">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày</p>
                          <div className="space-y-0.5 text-[11px]">
                            <p className="text-slate-400">Tiêu: <span className="font-semibold text-slate-600">{formatValue(dTarget, kpi.type)}</span></p>
                            <p className="text-slate-400">Thực: <span className="font-bold text-slate-700">{formatValue(dActual, kpi.type)}</span></p>
                            <p className={clsx("font-bold text-xs mt-1", getPercentColorClass(dPct))}>
                              {dPct !== null ? `${dPct}%` : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>

        {/* Empty status check */}
        {!loading && targetUserIds.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 font-medium">
            Không tìm thấy dữ liệu cán bộ hoặc phòng ban tương ứng. Vui lòng kiểm tra lại bộ lọc.
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
