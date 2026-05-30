"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { TableSkeleton } from "@/components/skeletons"
import { createPlan, fetchPlanAssignments, fetchPlans, fetchProfiles, upsertPlanAssignment, fetchWeeklyPlans, fetchDailyPlans, upsertWeeklyPlan, upsertDailyPlans } from "@/lib/supabase/api"
import { getSupabase } from "@/lib/supabase/client"
import { useAuthStore } from "@/store/useAuthStore"
import { Plan, PlanAssignment, Profile } from "@/types/models"
import { BarChart3, Building2, CalendarDays, CheckCircle2, Download, FileSpreadsheet, Layers3, Loader2, Plus, Save, Search, Sparkles, Target, Upload, Users2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import * as XLSX from 'xlsx'

type AssignmentDraft = {
  target_loans_amount: number
  target_deposits_amount: number
  target_calls: number
  target_cif_moi: number
  target_bidv_direct: number
  target_bh_nhan_tho: number
  target_bh_khoan_vay: number
  target_huy_dong_tang_rong: number
  target_du_no_ngan_han_tang_rong: number
  target_du_no_trung_han_tang_rong: number
  target_cap_moi_hmtd: number
}

type CreatePlanForm = {
  title: string
  description: string
  target_date: string
}

const DEFAULT_DRAFT: AssignmentDraft = {
  target_loans_amount: 0,
  target_deposits_amount: 0,
  target_calls: 0,
  target_cif_moi: 0,
  target_bidv_direct: 0,
  target_bh_nhan_tho: 0,
  target_bh_khoan_vay: 0,
  target_huy_dong_tang_rong: 0,
  target_du_no_ngan_han_tang_rong: 0,
  target_du_no_trung_han_tang_rong: 0,
  target_cap_moi_hmtd: 0,
}

const EMPTY_PLAN_FORM: CreatePlanForm = {
  title: "",
  description: "",
  target_date: new Date().toISOString().slice(0, 10),
}

const CORE_FIELDS: Array<{ key: keyof AssignmentDraft; label: string; unit: string; step?: string }> = [
  { key: "target_loans_amount", label: "Chỉ tiêu vay", unit: "VNĐ", step: "0.01" },
  { key: "target_deposits_amount", label: "Chỉ tiêu gửi", unit: "VNĐ", step: "0.01" },
  { key: "target_calls", label: "Chỉ tiêu gọi", unit: "Cuộc", step: "1" },
]

const PRODUCT_FIELDS: Array<{ key: keyof AssignmentDraft; label: string; unit: string; step?: string }> = [
  { key: "target_cif_moi", label: "CIF mới", unit: "KH", step: "1" },
  { key: "target_bidv_direct", label: "BIDV Direct", unit: "KH", step: "1" },
  { key: "target_bh_nhan_tho", label: "BH nhân thọ", unit: "Triệu", step: "0.01" },
  { key: "target_bh_khoan_vay", label: "BH khoản vay", unit: "Triệu", step: "0.01" },
  { key: "target_cap_moi_hmtd", label: "Cấp mới HMTD", unit: "KH", step: "1" },
]

const GROWTH_FIELDS: Array<{ key: keyof AssignmentDraft; label: string; unit: string; step?: string }> = [
  { key: "target_huy_dong_tang_rong", label: "Huy động tăng ròng", unit: "VNĐ", step: "0.01" },
  { key: "target_du_no_ngan_han_tang_rong", label: "Dư nợ ngắn hạn tăng ròng", unit: "VNĐ", step: "0.01" },
  { key: "target_du_no_trung_han_tang_rong", label: "Dư nợ trung dài hạn tăng ròng", unit: "VNĐ", step: "0.01" },
]

const ALL_ASSIGNMENT_FIELDS: Array<{ key: keyof AssignmentDraft; label: string; unit: string; step?: string }> = [...CORE_FIELDS, ...PRODUCT_FIELDS, ...GROWTH_FIELDS]

const CORE_FIELD_KEYS = new Set<keyof AssignmentDraft>(CORE_FIELDS.map((field) => field.key))
const PRODUCT_FIELD_KEYS = new Set<keyof AssignmentDraft>(PRODUCT_FIELDS.map((field) => field.key))
const GROWTH_FIELD_KEYS = new Set<keyof AssignmentDraft>(GROWTH_FIELDS.map((field) => field.key))

function getFieldGroup(key: keyof AssignmentDraft) {
  if (CORE_FIELD_KEYS.has(key)) return "core"
  if (PRODUCT_FIELD_KEYS.has(key)) return "product"
  return "growth"
}

function getFieldHeaderClass(key: keyof AssignmentDraft) {
  const group = getFieldGroup(key)
  if (group === "core") return "bg-teal-50 text-[#006b68]"
  if (group === "product") return "bg-teal-100/60 text-[#005451]"
  return "bg-[#ccedea]/40 text-[#003e3b]"
}

function getFieldInputTone(key: keyof AssignmentDraft) {
  const group = getFieldGroup(key)
  if (group === "core") return "border-teal-200 bg-teal-50/60 group-hover:border-teal-300"
  if (group === "product") return "border-teal-300/70 bg-teal-100/30 group-hover:border-teal-400"
  return "border-teal-200 bg-[#ccedea]/20 group-hover:border-teal-300"
}

function getFieldChipClass(key: keyof AssignmentDraft) {
  const group = getFieldGroup(key)
  if (group === "core") return "bg-teal-50 text-[#006b68] border border-teal-200/50"
  if (group === "product") return "bg-teal-100 text-[#005451]"
  return "bg-[#ccedea] text-[#003e3b]"
}

function buildDraft(assignment?: Partial<PlanAssignment> | null): AssignmentDraft {
  return {
    target_loans_amount: Number(assignment?.target_loans_amount || 0),
    target_deposits_amount: Number(assignment?.target_deposits_amount || 0),
    target_calls: Number(assignment?.target_calls || 0),
    target_cif_moi: Number(assignment?.target_cif_moi || 0),
    target_bidv_direct: Number(assignment?.target_bidv_direct || 0),
    target_bh_nhan_tho: Number(assignment?.target_bh_nhan_tho || 0),
    target_bh_khoan_vay: Number(assignment?.target_bh_khoan_vay || 0),
    target_huy_dong_tang_rong: Number(assignment?.target_huy_dong_tang_rong || 0),
    target_du_no_ngan_han_tang_rong: Number(assignment?.target_du_no_ngan_han_tang_rong || 0),
    target_du_no_trung_han_tang_rong: Number(assignment?.target_du_no_trung_han_tang_rong || 0),
    target_cap_moi_hmtd: Number(assignment?.target_cap_moi_hmtd || 0),
  }
}

function draftsEqual(a?: AssignmentDraft, b?: AssignmentDraft) {
  const left = a || DEFAULT_DRAFT
  const right = b || DEFAULT_DRAFT
  return Object.keys(DEFAULT_DRAFT).every((key) => left[key as keyof AssignmentDraft] === right[key as keyof AssignmentDraft])
}

function formatPlanDate(value?: string) {
  if (!value) return "Chưa có ngày"
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0)
}

function countConfiguredTargets(draft?: AssignmentDraft) {
  const current = draft || DEFAULT_DRAFT
  return Object.values(current).filter((value) => Number(value) > 0).length
}

function parseNumericCell(value: string) {
  const raw = value.trim()
  if (!raw) return 0

  let normalized = raw.replace(/\s+/g, "")

  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "")
  } else if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.lastIndexOf(",") > normalized.lastIndexOf(".") ? normalized.replace(/\./g, "").replace(",", ".") : normalized.replace(/,/g, "")
  } else if (normalized.includes(",")) {
    normalized = /^\d+,\d+$/.test(normalized) ? normalized.replace(",", ".") : normalized.replace(/,/g, "")
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export default function KpiTargetsPage() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [assignments, setAssignments] = useState<PlanAssignment[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [savingUserId, setSavingUserId] = useState<string | null>(null)
  const [savingAll, setSavingAll] = useState(false)
  const [planForm, setPlanForm] = useState<CreatePlanForm>(EMPTY_PLAN_FORM)
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({})
  const [copySourceUserId, setCopySourceUserId] = useState("")
  const [copyTargetUserIds, setCopyTargetUserIds] = useState<string[]>([])
  const [pasteMatrix, setPasteMatrix] = useState("")
  const [importingExcel, setImportingExcel] = useState(false)
  const excelInputRef = useRef<HTMLInputElement>(null)

  // Helper to format date as YYYY-MM-DD local
  const toDateStr = useCallback((d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }, [])

  // Helper to get Monday of a date
  const getMonday = useCallback((d: Date) => {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff))
  }, [])

  const [selectedMonday, setSelectedMonday] = useState(() => toDateStr(getMonday(new Date())))
  const [weeklyDraft, setWeeklyDraft] = useState<AssignmentDraft>(DEFAULT_DRAFT)
  const [dailyDrafts, setDailyDrafts] = useState<Record<string, AssignmentDraft>>({})
  const [personalLoading, setPersonalLoading] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [monthlyActual, setMonthlyActual] = useState<any>(null)
  const [activeDayTab, setActiveDayTab] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const canManage = user?.role === "ADMIN_LEVEL_1" || user?.role === "ADMIN_LEVEL_2"

  const visibleUsers = useMemo(() => {
    const specialists = profiles.filter((profile) => profile.role === "USER")
    if (user?.role === "ADMIN_LEVEL_1") return specialists
    if (user?.role === "ADMIN_LEVEL_2") {
      return specialists.filter((profile) => profile.department_id === user.department_id)
    }
    return specialists.filter((profile) => profile.id === user?.id)
  }, [profiles, user])

  const assignmentMap = useMemo(() => {
    return assignments.reduce<Record<string, PlanAssignment>>((acc, assignment) => {
      acc[assignment.user_id] = assignment
      return acc
    }, {})
  }, [assignments])

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) || null, [plans, selectedPlanId])

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return visibleUsers
    return visibleUsers.filter((profile) => {
      return profile.full_name.toLowerCase().includes(query) || profile.email.toLowerCase().includes(query) || (profile.department_id || "").toLowerCase().includes(query)
    })
  }, [searchQuery, visibleUsers])

  const filteredUserIds = useMemo(() => filteredUsers.map((profile) => profile.id), [filteredUsers])

  const dirtyUserIds = useMemo(() => {
    return visibleUsers
      .filter((profile) => !draftsEqual(drafts[profile.id], buildDraft(assignmentMap[profile.id])))
      .map((profile) => profile.id)
  }, [assignmentMap, drafts, visibleUsers])

  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true)
      const [plansData, profilesData] = await Promise.all([fetchPlans(), fetchProfiles()])
      setPlans(plansData)
      setProfiles(profilesData)
      if (!selectedPlanId && plansData.length > 0) {
        setSelectedPlanId(plansData[0].id)
      }
    } catch (error: any) {
      toast.error(`Không thể tải dữ liệu KPI: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [selectedPlanId])

  const loadAssignments = useCallback(async (planId: string) => {
    if (!planId) {
      setAssignments([])
      return
    }
    try {
      const data = await fetchPlanAssignments(planId)
      setAssignments(data)
    } catch (error: any) {
      toast.error(`Không thể tải phân bổ KPI: ${error.message}`)
    }
  }, [])

  // Load personal weekly & daily plans
  const loadPersonalPlans = useCallback(async (userId: string, mondayStr: string) => {
    try {
      setPersonalLoading(true)
      const mon = new Date(mondayStr)
      const fri = new Date(mon)
      fri.setDate(mon.getDate() + 4)
      const fridayStr = toDateStr(fri)
      
      // Fetch weekly plan
      const weeks = await fetchWeeklyPlans(userId)
      const thisWeekPlan = weeks.find((w: any) => w.start_date === mondayStr)
      setWeeklyDraft(thisWeekPlan ? buildDraft(thisWeekPlan) : DEFAULT_DRAFT)

      // Fetch daily plans
      const dailies = await fetchDailyPlans(userId, mondayStr, fridayStr)
      const nextDailyDrafts: Record<string, AssignmentDraft> = {}
      for (let i = 0; i < 5; i++) {
        const d = new Date(mon)
        d.setDate(mon.getDate() + i)
        const dStr = toDateStr(d)
        const dayPlan = dailies.find((dp: any) => dp.target_date === dStr)
        nextDailyDrafts[dStr] = dayPlan ? buildDraft(dayPlan) : DEFAULT_DRAFT
      }
      setDailyDrafts(nextDailyDrafts)
    } catch (err: any) {
      toast.error("Lỗi tải kế hoạch tuần/ngày: " + err.message)
    } finally {
      setPersonalLoading(false)
    }
  }, [toDateStr])

  // Load monthly actuals for current user and selected plan period
  const loadMonthlyActuals = useCallback(async (plan: Plan) => {
    if (!user?.id) return
    try {
      const planDate = new Date(plan.target_date)
      const year = planDate.getFullYear()
      const month = planDate.getMonth()
      const startDateStr = toDateStr(new Date(year, month, 1))
      const endDateStr = toDateStr(new Date(year, month + 1, 0))

      const supabase = getSupabase()
      const { data, error } = await supabase.rpc('get_kpi_summary', {
        start_date: startDateStr,
        end_date: endDateStr
      })
      if (error) throw error
      
      const userSummary = data?.find((row: any) => row.manager_id === user.id)
      setMonthlyActual(userSummary || null)
    } catch (err) {
      console.error("Failed to load monthly actuals:", err)
    }
  }, [user?.id, toDateStr])

  // Save personal weekly & daily plans
  const handleSavePersonal = async () => {
    if (!user?.id) return
    try {
      setSavingPersonal(true)
      const mon = new Date(selectedMonday)
      const fri = new Date(mon)
      fri.setDate(mon.getDate() + 4)
      const fridayStr = toDateStr(fri)

      // Save weekly plan
      await upsertWeeklyPlan({
        user_id: user.id,
        start_date: selectedMonday,
        end_date: fridayStr,
        ...weeklyDraft
      })

      // Save daily plans
      const dailyPayloads = Object.keys(dailyDrafts).map((dStr) => ({
        user_id: user.id,
        target_date: dStr,
        ...dailyDrafts[dStr]
      }))
      await upsertDailyPlans(dailyPayloads)

      toast.success("Đã lưu kế hoạch tuần và ngày thành công!")
      loadPersonalPlans(user.id, selectedMonday)
    } catch (err: any) {
      toast.error("Lỗi lưu kế hoạch: " + err.message)
    } finally {
      setSavingPersonal(false)
    }
  }

  // Auto distribute weekly target to 5 working days (Monday - Friday)
  const handleAutoDistribute = () => {
    const nextDailies = { ...dailyDrafts }
    const mon = new Date(selectedMonday)
    
    for (let i = 0; i < 5; i++) {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      const dStr = toDateStr(d)
      const dayDraft: AssignmentDraft = { ...DEFAULT_DRAFT }
      
      Object.keys(weeklyDraft).forEach((key) => {
        const val = weeklyDraft[key as keyof AssignmentDraft]
        const isInteger = ["target_calls", "target_cif_moi", "target_bidv_direct", "target_cap_moi_hmtd"].includes(key)
        if (isInteger) {
          const base = Math.floor(val / 5)
          const remainder = val % 5
          dayDraft[key as keyof AssignmentDraft] = base + (i < remainder ? 1 : 0)
        } else {
          dayDraft[key as keyof AssignmentDraft] = parseFloat((val / 5).toFixed(2))
        }
      })
      nextDailies[dStr] = dayDraft
    }
    
    setDailyDrafts(nextDailies)
    toast.success("Đã tự động phân bổ chỉ tiêu tuần đều cho các ngày từ Thứ 2 đến Thứ 6")
  }

  useEffect(() => {
    if (mounted) {
      loadBaseData()
    }
  }, [mounted, loadBaseData])

  useEffect(() => {
    if (selectedPlanId) {
      loadAssignments(selectedPlanId)
    }
  }, [loadAssignments, selectedPlanId])

  useEffect(() => {
    if (mounted && user?.id && !canManage) {
      loadPersonalPlans(user.id, selectedMonday)
    }
  }, [mounted, user?.id, selectedMonday, canManage, loadPersonalPlans])

  useEffect(() => {
    if (selectedMonday && !activeDayTab) {
      setActiveDayTab(selectedMonday)
    }
  }, [selectedMonday, activeDayTab])

  useEffect(() => {
    if (mounted && selectedPlan && !canManage) {
      loadMonthlyActuals(selectedPlan)
    }
  }, [mounted, selectedPlan, canManage, loadMonthlyActuals])

  useEffect(() => {
    const nextDrafts: Record<string, AssignmentDraft> = {}
    visibleUsers.forEach((profile) => {
      nextDrafts[profile.id] = buildDraft(assignmentMap[profile.id])
    })
    setDrafts(nextDrafts)
  }, [assignmentMap, visibleUsers, selectedPlanId])

  useEffect(() => {
    const nextSourceUserId = filteredUserIds.includes(copySourceUserId) ? copySourceUserId : filteredUserIds[0] || ""
    if (nextSourceUserId !== copySourceUserId) {
      setCopySourceUserId(nextSourceUserId)
    }
    setCopyTargetUserIds((prev) => prev.filter((userId) => filteredUserIds.includes(userId) && userId !== nextSourceUserId))
  }, [copySourceUserId, filteredUserIds])

  const handleDraftChange = (userId: string, key: keyof AssignmentDraft, value: number) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || DEFAULT_DRAFT),
        [key]: value,
      },
    }))
  }

  const handleToggleCopyTarget = (userId: string) => {
    setCopyTargetUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSelectAllCopyTargets = () => {
    setCopyTargetUserIds(filteredUserIds.filter((userId) => userId !== copySourceUserId))
  }

  const handleApplyCopyTargets = () => {
    if (!copySourceUserId) {
      toast.error("Vui lòng chọn nhân sự nguồn để sao chép KPI")
      return
    }
    if (copyTargetUserIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một nhân sự nhận KPI")
      return
    }

    const sourceDraft = { ...(drafts[copySourceUserId] || buildDraft(assignmentMap[copySourceUserId])) }
    setDrafts((prev) => {
      const nextDrafts = { ...prev }
      copyTargetUserIds.forEach((userId) => {
        nextDrafts[userId] = { ...sourceDraft }
      })
      return nextDrafts
    })
    toast.success(`Đã sao chép KPI cho ${copyTargetUserIds.length} nhân sự`)
  }

  const handleApplyPasteMatrix = () => {
    if (!pasteMatrix.trim()) {
      toast.error("Vui lòng dán dữ liệu từ Excel trước khi áp dụng")
      return
    }
    if (filteredUsers.length === 0) {
      toast.error("Không có nhân sự hiển thị để áp dụng dữ liệu dán")
      return
    }

    const rows = pasteMatrix
      .trim()
      .split(/\r?\n/)
      .map((row) => row.split("\t").map((cell) => cell.trim()))
      .filter((cells) => cells.some((cell) => cell.length > 0))
      .map((cells) => (cells.length > ALL_ASSIGNMENT_FIELDS.length ? cells.slice(-ALL_ASSIGNMENT_FIELDS.length) : cells))
      .filter((cells) => cells.some((cell) => parseNumericCell(cell) !== null && cell !== ""))

    if (rows.length === 0) {
      toast.error("Không đọc được dữ liệu số hợp lệ từ nội dung đã dán")
      return
    }

    let appliedUsers = 0
    let appliedCells = 0

    setDrafts((prev) => {
      const nextDrafts = { ...prev }
      rows.slice(0, filteredUsers.length).forEach((cells, rowIndex) => {
        const profile = filteredUsers[rowIndex]
        if (!profile) return

        const nextDraft = { ...(prev[profile.id] || DEFAULT_DRAFT) }
        let rowTouched = false

        ALL_ASSIGNMENT_FIELDS.forEach((field, columnIndex) => {
          const cell = cells[columnIndex]
          if (cell === undefined || cell === "") return
          const parsed = parseNumericCell(cell)
          if (parsed === null) return
          nextDraft[field.key] = parsed
          rowTouched = true
          appliedCells += 1
        })

        if (rowTouched) {
          nextDrafts[profile.id] = nextDraft
          appliedUsers += 1
        }
      })
      return nextDrafts
    })

    if (appliedUsers === 0) {
      toast.error("Dữ liệu dán không khớp với ma trận hiện tại")
      return
    }

    setPasteMatrix("")
    toast.success(`Đã áp dụng ${appliedCells} ô KPI cho ${appliedUsers} nhân sự`)
  }

  const handleCreatePlan = async () => {
    if (!planForm.title.trim() || !planForm.target_date) {
      toast.error("Vui lòng nhập tên kỳ KPI và ngày áp dụng")
      return
    }
    try {
      setCreatingPlan(true)
      const created = await createPlan({
        title: planForm.title.trim(),
        description: planForm.description.trim() || null,
        target_date: planForm.target_date,
      })
      const nextPlans = [created, ...plans]
      setPlans(nextPlans)
      setSelectedPlanId(created.id)
      setPlanForm(EMPTY_PLAN_FORM)
      setShowCreatePlan(false)
      toast.success("Đã tạo kỳ KPI mới")
    } catch (error: any) {
      toast.error(`Không thể tạo kỳ KPI: ${error.message}`)
    } finally {
      setCreatingPlan(false)
    }
  }

  const handleDownloadKpiTemplate = () => {
    const header = [
      'Chuyên viên',
      'Chỉ tiêu vay (VNĐ)',
      'Chỉ tiêu gửi (VNĐ)',
      'Chỉ tiêu gọi (Cuộc)',
      'CIF mới (KH)',
      'BIDV Direct (KH)',
      'BH nhân thọ (Triệu)',
      'BH khoản vay (Triệu)',
      'Cấp mới HMTD (KH)',
      'Huy động tăng ròng (VNĐ)',
      'Dư nợ ngắn hạn tăng ròng (VNĐ)',
      'Dư nợ trung dài hạn tăng ròng (VNĐ)',
    ]
    const sampleData = visibleUsers.map(p => ({
      'Chuyên viên': p.full_name,
      'Chỉ tiêu vay (VNĐ)': 0,
      'Chỉ tiêu gửi (VNĐ)': 0,
      'Chỉ tiêu gọi (Cuộc)': 0,
      'CIF mới (KH)': 0,
      'BIDV Direct (KH)': 0,
      'BH nhân thọ (Triệu)': 0,
      'BH khoản vay (Triệu)': 0,
      'Cấp mới HMTD (KH)': 0,
      'Huy động tăng ròng (VNĐ)': 0,
      'Dư nợ ngắn hạn tăng ròng (VNĐ)': 0,
      'Dư nợ trung dài hạn tăng ròng (VNĐ)': 0,
    }))
    const ws = XLSX.utils.json_to_sheet(sampleData, { header })
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'KPI_Template')
    XLSX.writeFile(wb, `mau_kpi_${selectedPlan?.title || 'template'}.xlsx`)
  }

  const handleImportKpiExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!selectedPlanId) {
      toast.error('Vui lòng chọn kỳ KPI trước khi import')
      return
    }
    setImportingExcel(true)
    const reader = new FileReader()
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result
        if (!data) return
        const wb = XLSX.read(data, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<any>(ws)
        if (rows.length === 0) { toast.error('File không có dữ liệu'); return }

        // Build slugify helper
        const slugify = (s: string) => s.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]/g, '')

        let applied = 0
        const nextDrafts: Record<string, AssignmentDraft> = { ...drafts }
        for (const row of rows) {
          const name = String(row['Chuyên viên'] || '').trim()
          const match = visibleUsers.find(p => slugify(p.full_name) === slugify(name))
          if (!match) continue
          nextDrafts[match.id] = {
            target_loans_amount: Number(row['Chỉ tiêu vay (VNĐ)'] || 0),
            target_deposits_amount: Number(row['Chỉ tiêu gửi (VNĐ)'] || 0),
            target_calls: Number(row['Chỉ tiêu gọi (Cuộc)'] || 0),
            target_cif_moi: Number(row['CIF mới (KH)'] || 0),
            target_bidv_direct: Number(row['BIDV Direct (KH)'] || 0),
            target_bh_nhan_tho: Number(row['BH nhân thọ (Triệu)'] || 0),
            target_bh_khoan_vay: Number(row['BH khoản vay (Triệu)'] || 0),
            target_cap_moi_hmtd: Number(row['Cấp mới HMTD (KH)'] || 0),
            target_huy_dong_tang_rong: Number(row['Huy động tăng ròng (VNĐ)'] || 0),
            target_du_no_ngan_han_tang_rong: Number(row['Dư nợ ngắn hạn tăng ròng (VNĐ)'] || 0),
            target_du_no_trung_han_tang_rong: Number(row['Dư nợ trung dài hạn tăng ròng (VNĐ)'] || 0),
          }
          applied++
        }
        setDrafts(nextDrafts)
        toast.success(`Đã đọc KPI cho ${applied}/${rows.length} chuyên viên. Kiểm tra lại và nhấn Lưu tất cả.`)
      } catch (err: any) {
        toast.error('Lỗi đọc file: ' + err.message)
      } finally {
        setImportingExcel(false)
        if (excelInputRef.current) excelInputRef.current.value = ''
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleSaveUser = async (profile: Profile) => {
    if (!selectedPlanId) {
      toast.error("Bạn cần tạo hoặc chọn kỳ KPI trước")
      return
    }
    try {
      setSavingUserId(profile.id)
      const draft = drafts[profile.id] || DEFAULT_DRAFT
      await upsertPlanAssignment({
        plan_id: selectedPlanId,
        user_id: profile.id,
        ...draft,
      })
      await loadAssignments(selectedPlanId)
      toast.success(`Đã lưu KPI cho ${profile.full_name}`)
    } catch (error: any) {
      toast.error(`Lưu KPI thất bại: ${error.message}`)
    } finally {
      setSavingUserId(null)
    }
  }

  const handleSaveAll = async () => {
    if (!selectedPlanId) {
      toast.error("Bạn cần tạo hoặc chọn kỳ KPI trước")
      return
    }
    if (dirtyUserIds.length === 0) {
      toast.message("Không có thay đổi nào cần lưu")
      return
    }
    try {
      setSavingAll(true)
      await Promise.all(
        dirtyUserIds.map((userId) =>
          upsertPlanAssignment({
            plan_id: selectedPlanId,
            user_id: userId,
            ...(drafts[userId] || DEFAULT_DRAFT),
          })
        )
      )
      await loadAssignments(selectedPlanId)
      toast.success(`Đã lưu ${dirtyUserIds.length} phân bổ KPI`)
    } catch (error: any) {
      toast.error(`Lưu hàng loạt thất bại: ${error.message}`)
    } finally {
      setSavingAll(false)
    }
  }

  if (!mounted) return <TableSkeleton title="Thiết lập KPI mục tiêu" rows={6} columns={6} />

  const renderSpecialistView = () => {
    const myAssignment = assignments.find(a => a.user_id === user?.id)
    const mon = new Date(selectedMonday)
    const weekDates = Array.from({ length: 5 }).map((_, i) => {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      return toDateStr(d)
    })
    const fridayStr = weekDates[4]

    const getFieldActualValue = (fieldKey: string) => {
      if (fieldKey === 'target_loans_amount') return Number(myAssignment?.actual_loans_amount || 0)
      if (fieldKey === 'target_deposits_amount') return Number(myAssignment?.actual_deposits_amount || 0)
      if (fieldKey === 'target_calls') return Number(myAssignment?.actual_calls || 0)
      
      if (!monthlyActual) return 0
      const mapping: Record<string, string> = {
        target_cif_moi: 'cif_moi',
        target_bidv_direct: 'bidv_direct',
        target_bh_nhan_tho: 'bh_nhan_tho',
        target_bh_khoan_vay: 'bh_khoan_vay',
        target_huy_dong_tang_rong: 'huy_dong_tang_rong',
        target_du_no_ngan_han_tang_rong: 'du_no_ngan_han_tang_rong',
        target_du_no_trung_han_tang_rong: 'du_no_trung_han_tang_rong',
        target_cap_moi_hmtd: 'cap_moi_hmtd'
      }
      const actualKey = mapping[fieldKey]
      return Number(monthlyActual[actualKey] || 0)
    }

    return (
      <div className="flex flex-col gap-6">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(51,183,171,0.25),_transparent_40%),linear-gradient(135deg,_#002b29_0%,_#004d4a_50%,_#006b68_100%)] p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.28)] md:p-8">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 backdrop-blur-xl">
              <Sparkles className="h-3.5 w-3.5" />
              Specialist planning workspace
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Kế hoạch chỉ tiêu cá nhân</h2>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                Xem chỉ tiêu tháng được giao, lập và phân bổ kế hoạch hoạt động tuần và ngày của bạn để bám sát mục tiêu.
              </p>
            </div>
          </div>
        </section>

        {/* 1. Monthly Targets (Read-only) */}
        <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-6 shadow-sm backdrop-blur-xl">
          <h3 className="text-lg font-bold text-slate-800 border-b pb-3 mb-5 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#006b68]" /> Chỉ tiêu tháng được giao (Kỳ: {selectedPlan?.title || "Chưa chọn"})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {ALL_ASSIGNMENT_FIELDS.map((field) => {
              const targetVal = Number(myAssignment?.[field.key] || 0)
              const actualVal = getFieldActualValue(field.key)
              const pct = targetVal > 0 ? Math.round((actualVal / targetVal) * 100) : null
              return (
                <div key={field.key} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">{field.label}</p>
                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-lg font-bold text-slate-800">{formatCompact(actualVal)} <span className="text-xs font-normal text-slate-500">{field.unit}</span></p>
                    <p className="text-xs text-slate-400 font-semibold">Chỉ tiêu: {formatCompact(targetVal)}</p>
                  </div>
                  {pct !== null && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#006b68] to-[#33b7ab] transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Tiến độ</span>
                        <span className="text-xs font-bold text-[#006b68]">{pct}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* 2. Weekly & Daily targets setting */}
        <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left panel: Weekly targets input */}
          <div className="xl:col-span-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-[#006b68]" /> Lập chỉ tiêu Tuần
              </h3>
              <p className="text-xs text-slate-500 mt-1">Lên kế hoạch chỉ tiêu tuần và phân bổ đều cho 5 ngày làm việc.</p>
            </div>

            {/* Week Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Chọn tuần làm việc</label>
              <input
                type="date"
                value={selectedMonday}
                onChange={(e) => {
                  if (e.target.value) {
                    const mon = getMonday(new Date(e.target.value))
                    setSelectedMonday(toDateStr(mon))
                  }
                }}
                className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#006b68] focus:bg-white outline-none transition-all font-medium text-slate-800"
              />
              <p className="text-xs text-emerald-700 font-semibold mt-1">
                Tuần: Thứ 2 ({formatPlanDate(selectedMonday)}) - Thứ 6 ({formatPlanDate(fridayStr)})
              </p>
            </div>

            {/* Weekly Input Grid */}
            <div className="flex-1 overflow-auto max-h-[450px] pr-2 space-y-4">
              {ALL_ASSIGNMENT_FIELDS.map((field) => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{field.label} ({field.unit})</label>
                  <input
                    type="number"
                    min="0"
                    step={field.step || "1"}
                    value={weeklyDraft[field.key]}
                    onChange={(e) => setWeeklyDraft(prev => ({ ...prev, [field.key]: Number(e.target.value) || 0 }))}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#006b68] focus:bg-white outline-none transition-all font-semibold text-slate-800"
                  />
                </div>
              ))}
            </div>

            {/* Actions for Weekly */}
            <div className="flex flex-col gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={handleAutoDistribute}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-teal-50 hover:bg-teal-100/80 text-[#006b68] rounded-xl font-bold text-sm transition-all border border-teal-200/50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Tự động phân bổ tuần xuống ngày</span>
              </button>
            </div>
          </div>

          {/* Right panel: Daily targets tabs */}
          <div className="xl:col-span-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-5">
            <div className="border-b pb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-[#006b68]" /> Chi tiết Kế hoạch Ngày
              </h3>
              <p className="text-xs text-slate-500 mt-1">Điều chỉnh kế hoạch cụ thể cho từng ngày trong tuần.</p>
            </div>

            {/* Day Tabs */}
            <div className="flex border-b border-slate-100 overflow-x-auto gap-1 p-1 bg-slate-50 rounded-2xl">
              {weekDates.map((dStr, idx) => {
                const dayLabel = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu"][idx]
                const isActive = activeDayTab === dStr
                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setActiveDayTab(dStr)}
                    className={clsx(
                      "flex-1 min-w-[90px] py-2 px-3 text-xs font-bold rounded-xl transition-all text-center",
                      isActive
                        ? "bg-white text-[#006b68] shadow-sm border border-slate-200/50"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    )}
                  >
                    <div>{dayLabel}</div>
                    <div className="text-[10px] opacity-75 font-medium mt-0.5">{formatPlanDate(dStr).slice(0, 5)}</div>
                  </button>
                )
              })}
            </div>

            {/* Selected Day Inputs */}
            <div className="flex-1 overflow-auto max-h-[415px] pr-2 space-y-4">
              {activeDayTab && dailyDrafts[activeDayTab] ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ALL_ASSIGNMENT_FIELDS.map((field) => {
                    const dayDraft = dailyDrafts[activeDayTab] || DEFAULT_DRAFT
                    return (
                      <div key={field.key} className="flex flex-col gap-1.5 p-3.5 rounded-2xl border border-slate-100 bg-slate-50/30">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{field.label} ({field.unit})</label>
                        <input
                          type="number"
                          min="0"
                          step={field.step || "1"}
                          value={dayDraft[field.key]}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0
                            setDailyDrafts(prev => ({
                              ...prev,
                              [activeDayTab]: {
                                ...(prev[activeDayTab] || DEFAULT_DRAFT),
                                [field.key]: val
                              }
                            }))
                          }}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#006b68] focus:bg-white outline-none transition-all font-semibold text-slate-800"
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
                  Vui lòng chọn tuần và ngày ở thanh trên để chỉnh sửa chỉ tiêu ngày.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t flex justify-end">
              <button
                type="button"
                onClick={handleSavePersonal}
                disabled={personalLoading || savingPersonal}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#006b68] to-[#005451] hover:from-[#005451] hover:to-[#003e3b] text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50"
              >
                {savingPersonal ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                <span>Lưu toàn bộ kế hoạch Tuần & Ngày</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (loading && plans.length === 0 && profiles.length === 0) {
    return <TableSkeleton title="Thiết lập KPI mục tiêu" rows={6} columns={6} />
  }

  return (
    <DashboardLayout title={canManage ? "Thiết lập KPI mục tiêu" : "Kế hoạch KPI mục tiêu cá nhân"}>
      {canManage ? (
        <>
          <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(51,183,171,0.25),_transparent_40%),linear-gradient(135deg,_#002b29_0%,_#004d4a_50%,_#006b68_100%)] p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.28)] md:p-8">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                Admin KPI orchestration
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Phân bổ KPI hàng loạt theo ma trận nhân sự x chỉ tiêu</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Nhập trực tiếp trên bảng ma trận để giao chỉ tiêu nhanh cho nhiều chuyên viên trong một lần thao tác, bao gồm cả chỉ tiêu sản phẩm, dư nợ tăng ròng và huy động tăng ròng.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {user?.role === "ADMIN_LEVEL_1" && (
                <button
                  onClick={() => setShowCreatePlan(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
                >
                  <Plus className="h-4 w-4" />
                  Tạo kỳ KPI
                </button>
              )}
              <button
                onClick={handleSaveAll}
                disabled={savingAll || dirtyUserIds.length === 0 || !selectedPlanId}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu tất cả ({dirtyUserIds.length})
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-2 text-emerald-600">
              <Layers3 className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">Kỳ KPI</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{plans.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-2xl bg-cyan-50 p-2 text-cyan-600">
              <Users2 className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">Chuyên viên áp dụng</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{visibleUsers.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-2xl bg-blue-50 p-2 text-blue-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">Đã giao trong kỳ</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{assignments.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex rounded-2xl bg-amber-50 p-2 text-amber-600">
              <Target className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">Cần cập nhật</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{dirtyUserIds.length}</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tìm chuyên viên, email, phòng ban..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div className="flex flex-1 gap-3 overflow-x-auto pb-1">
              {plans.map((plan) => {
                const active = plan.id === selectedPlanId
                return (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={clsx(
                      "min-w-[220px] rounded-2xl border px-4 py-3 text-left transition-all",
                      active
                        ? "border-emerald-300 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{plan.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{plan.description || "Kỳ KPI chưa có mô tả"}</p>
                      </div>
                      <span className={clsx("rounded-full px-2 py-1 text-[11px] font-semibold", active ? "bg-emerald-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200")}>Kỳ</span>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatPlanDate(plan.target_date)}
                    </div>
                  </button>
                )
              })}
              {plans.length === 0 && (
                <div className="flex min-h-[86px] items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-sm text-slate-500">
                  Chưa có kỳ KPI nào. Hãy tạo kỳ đầu tiên để bắt đầu phân bổ.
                </div>
              )}
            </div>
          </div>
        </section>

        {selectedPlan && (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-900 p-2.5 text-white">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Kỳ đang thao tác</p>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-900">{selectedPlan.title}</h2>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Ngày áp dụng</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{formatPlanDate(selectedPlan.target_date)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Nhân sự hiển thị</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{filteredUsers.length}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Bản nháp chưa lưu</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{dirtyUserIds.length}</p>
                </div>
              </div>
            </div>
            <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,_rgba(209,250,229,0.6),_rgba(255,255,255,0.95))] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Upload KPI từ Excel</p>
                  <p className="text-sm text-slate-500">Tải file mẫu, điền KPI và import lại.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <input type="file" accept=".xlsx,.xls" ref={excelInputRef} className="hidden" onChange={handleImportKpiExcel} />
                <button
                  type="button"
                  disabled={!selectedPlanId || visibleUsers.length === 0}
                  onClick={handleDownloadKpiTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4" /> Tải file mẫu KPI
                </button>
                <button
                  type="button"
                  disabled={!selectedPlanId || importingExcel}
                  onClick={() => excelInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importingExcel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {importingExcel ? 'Đang đọc...' : 'Import file Excel'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">Sau khi import, kiểm tra lại bảng và nhấn <b>Lưu tất cả</b> để lưu vào hệ thống.</p>
            </div>
          </section>
        )}



        {filteredUsers.length > 0 && (
          <section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-slate-900">Bảng ma trận giao KPI</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Mỗi hàng là một chuyên viên, mỗi cột là một chỉ tiêu. Header được ghim khi cuộn dọc, cột nhân sự và tác vụ được ghim khi cuộn ngang để bạn nhập KPI liên tục.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{filteredUsers.length} nhân sự</span>
                <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-[#006b68]">{CORE_FIELDS.length} cột trọng tâm</span>
                <span className="inline-flex items-center rounded-full bg-teal-100 px-3 py-1 text-xs font-medium text-[#005451]">{PRODUCT_FIELDS.length} cột sản phẩm</span>
                <span className="inline-flex items-center rounded-full bg-[#ccedea] px-3 py-1 text-xs font-medium text-[#003e3b]">{GROWTH_FIELDS.length} cột tăng ròng</span>
              </div>
            </div>

            <div className="max-h-[72vh] overflow-auto">
              <table className="min-w-[2650px] w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th rowSpan={2} className="sticky left-0 top-0 z-50 min-w-[320px] border-b border-r border-[#001f1e] bg-[#002625] px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Nhân sự
                    </th>
                    <th colSpan={3} className="sticky top-0 z-40 border-b border-r border-[#001f1e] bg-[#002625] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-100">
                      Kết quả thực tế
                    </th>
                    <th colSpan={CORE_FIELDS.length} className="sticky top-0 z-40 border-b border-r border-[#002b29] bg-[#003835] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-50">
                      Chỉ tiêu trọng tâm
                    </th>
                    <th colSpan={PRODUCT_FIELDS.length} className="sticky top-0 z-40 border-b border-r border-[#003835] bg-[#004d4a] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-100">
                      Chỉ tiêu sản phẩm
                    </th>
                    <th colSpan={GROWTH_FIELDS.length} className="sticky top-0 z-40 border-b border-r border-[#004744] bg-[#005c58] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-teal-50">
                      Chỉ tiêu tăng ròng
                    </th>
                    <th rowSpan={2} className="sticky right-0 top-0 z-50 min-w-[180px] border-b border-l border-[#001f1e] bg-[#002625] px-4 py-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-white">
                      Tác vụ
                    </th>
                  </tr>
                  <tr>
                    <th className="sticky top-[52px] z-40 min-w-[120px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600">Vay thực tế</th>
                    <th className="sticky top-[52px] z-40 min-w-[120px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600">Gửi thực tế</th>
                    <th className="sticky top-[52px] z-40 min-w-[120px] border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-left text-xs font-semibold text-slate-600">Gọi thực tế</th>
                    {ALL_ASSIGNMENT_FIELDS.map((field, index) => (
                      <th
                        key={field.key}
                        className={clsx(
                          "sticky top-[52px] z-40 min-w-[150px] border-b border-slate-200 px-3 py-3 text-left align-top text-xs font-semibold",
                          getFieldHeaderClass(field.key),
                          index === CORE_FIELDS.length - 1 || index === ALL_ASSIGNMENT_FIELDS.length - 1 ? "border-r" : "border-r border-slate-200"
                        )}
                      >
                        <div className="flex min-h-[52px] flex-col justify-between gap-2">
                          <span>{field.label}</span>
                          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{field.unit}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((profile, index) => {
                    const draft = drafts[profile.id] || DEFAULT_DRAFT
                    const saving = savingUserId === profile.id
                    const currentAssignment = assignmentMap[profile.id]
                    const dirty = !draftsEqual(draft, buildDraft(currentAssignment))
                    const rowBackground = index % 2 === 0 ? "bg-white" : "bg-slate-50/70"

                    return (
                      <tr key={profile.id} className="group">
                        <td className={clsx("sticky left-0 z-20 border-b border-r border-slate-200 px-4 py-4 align-top", rowBackground)}>
                          <div className="flex items-start gap-3">
                            <div className={clsx("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-sm", dirty ? "bg-amber-500" : "bg-slate-900")}>
                              {profile.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0 space-y-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{profile.full_name}</p>
                                  <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold", dirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                                    {dirty ? "Chưa lưu" : "Đã đồng bộ"}
                                  </span>
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500">{profile.email}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                  <Building2 className="h-3.5 w-3.5" />
                                  {profile.department_id || "Chưa có phòng ban"}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                  <Target className="h-3.5 w-3.5" />
                                  {countConfiguredTargets(draft)} chỉ tiêu
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className={clsx("border-b border-r border-slate-200 px-3 py-4 text-sm font-semibold text-slate-900", rowBackground)}>
                          {formatCompact(Number(currentAssignment?.actual_loans_amount || 0))}
                        </td>
                        <td className={clsx("border-b border-r border-slate-200 px-3 py-4 text-sm font-semibold text-slate-900", rowBackground)}>
                          {formatCompact(Number(currentAssignment?.actual_deposits_amount || 0))}
                        </td>
                        <td className={clsx("border-b border-r border-slate-200 px-3 py-4 text-sm font-semibold text-slate-900", rowBackground)}>
                          {formatCompact(Number(currentAssignment?.actual_calls || 0))}
                        </td>

                        {ALL_ASSIGNMENT_FIELDS.map((field) => (
                          <td key={field.key} className={clsx("border-b border-r border-slate-200 px-2 py-3 align-top", rowBackground)}>
                            <div className={clsx("min-w-[145px] rounded-xl border px-3 py-2 shadow-sm transition", getFieldInputTone(field.key))}>
                              <input
                                type="number"
                                min="0"
                                step={field.step || "1"}
                                value={draft[field.key]}
                                onChange={(event) => handleDraftChange(profile.id, field.key, Number(event.target.value) || 0)}
                                aria-label={`${profile.full_name} - ${field.label}`}
                                className="h-8 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none focus:ring-0"
                              />
                              <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{field.unit}</div>
                            </div>
                          </td>
                        ))}

                        <td className={clsx("sticky right-0 z-20 border-b border-l border-slate-200 px-4 py-4 align-top", rowBackground)}>
                          <div className="flex min-w-[150px] flex-col gap-2">
                            <span className={clsx("inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold", dirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                              {dirty ? "Chưa lưu" : "Đã đồng bộ"}
                            </span>
                            <button
                              onClick={() => handleSaveUser(profile)}
                              disabled={saving || !selectedPlanId}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Lưu dòng
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {filteredUsers.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500">
            Không tìm thấy chuyên viên phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {showCreatePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-md" onClick={() => setShowCreatePlan(false)}>
          <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.24)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-emerald-600">Kỳ KPI mới</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Tạo kỳ giao chỉ tiêu</h3>
              </div>
              <button onClick={() => setShowCreatePlan(false)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50">
                Đóng
              </button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Tên kỳ KPI</span>
                <input
                  type="text"
                  value={planForm.title}
                  onChange={(event) => setPlanForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="VD: KPI Tháng 06/2026"
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Ngày áp dụng</span>
                  <input
                    type="date"
                    value={planForm.target_date}
                    onChange={(event) => setPlanForm((prev) => ({ ...prev, target_date: event.target.value }))}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Gợi ý</p>
                  <p className="mt-2 text-sm text-slate-600">Đặt tên theo tháng/quý để report GAS dễ nhận diện và sync lại trong cùng một chu kỳ.</p>
                </div>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Mô tả</span>
                <textarea
                  rows={4}
                  value={planForm.description}
                  onChange={(event) => setPlanForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Mô tả ngắn về kỳ giao KPI, phạm vi áp dụng hoặc ghi chú quản trị..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreatePlan(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                Hủy
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={creatingPlan}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {creatingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tạo kỳ KPI
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      ) : (
        renderSpecialistView()
      )}
    </DashboardLayout>
  )
}
