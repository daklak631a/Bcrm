"use client"

import clsx from "clsx"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { TableSkeleton } from "@/components/skeletons"
import { createPlan, fetchPlanAssignments, fetchPlans, fetchProfiles, upsertPlanAssignment } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"
import { Plan, PlanAssignment, Profile } from "@/types/models"
import { BarChart3, Building2, CalendarDays, CheckCircle2, Layers3, LineChart, Loader2, Plus, Save, Search, Sparkles, Target, TrendingUp, Users2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

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
  { key: "target_huy_dong_tang_rong", label: "HĐ tăng ròng", unit: "VNĐ", step: "0.01" },
  { key: "target_du_no_ngan_han_tang_rong", label: "DN ngắn hạn", unit: "VNĐ", step: "0.01" },
  { key: "target_du_no_trung_han_tang_rong", label: "DN trung dài hạn", unit: "VNĐ", step: "0.01" },
]

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

function MetricSection({
  title,
  icon,
  fields,
  draft,
  onChange,
}: {
  title: string
  icon: React.ReactNode
  fields: Array<{ key: keyof AssignmentDraft; label: string; unit: string; step?: string }>
  draft: AssignmentDraft
  onChange: (key: keyof AssignmentDraft, value: number) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 backdrop-blur-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200">{icon}</span>
        {title}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1 rounded-xl bg-white/90 p-3 ring-1 ring-slate-200/70">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">{field.label}</span>
            <div className="flex items-end justify-between gap-3">
              <input
                type="number"
                min="0"
                step={field.step || "1"}
                value={draft[field.key]}
                onChange={(event) => onChange(field.key, Number(event.target.value) || 0)}
                className="w-full border-0 bg-transparent p-0 text-lg font-semibold text-slate-900 outline-none focus:ring-0"
              />
              <span className="whitespace-nowrap text-xs font-medium text-slate-400">{field.unit}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
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
    return []
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

  useEffect(() => {
    if (mounted && canManage) {
      loadBaseData()
    }
  }, [mounted, canManage, loadBaseData])

  useEffect(() => {
    if (selectedPlanId) {
      loadAssignments(selectedPlanId)
    }
  }, [loadAssignments, selectedPlanId])

  useEffect(() => {
    const nextDrafts: Record<string, AssignmentDraft> = {}
    visibleUsers.forEach((profile) => {
      nextDrafts[profile.id] = buildDraft(assignmentMap[profile.id])
    })
    setDrafts(nextDrafts)
  }, [assignmentMap, visibleUsers, selectedPlanId])

  const handleDraftChange = (userId: string, key: keyof AssignmentDraft, value: number) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || DEFAULT_DRAFT),
        [key]: value,
      },
    }))
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

  if (!canManage) {
    return (
      <DashboardLayout title="Thiết lập KPI mục tiêu">
        <div className="flex h-[50vh] items-center justify-center text-slate-500">
          Bạn không có quyền truy cập trang này.
        </div>
      </DashboardLayout>
    )
  }

  if (loading && plans.length === 0 && profiles.length === 0) {
    return <TableSkeleton title="Thiết lập KPI mục tiêu" rows={6} columns={6} />
  }

  return (
    <DashboardLayout title="Thiết lập KPI mục tiêu">
      <div className="flex flex-col gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_34%),linear-gradient(135deg,_#08111f_0%,_#0f172a_45%,_#111827_100%)] p-6 text-white shadow-[0_20px_70px_rgba(15,23,42,0.28)] md:p-8">
          <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="absolute left-1/3 top-0 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200 backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5" />
                Admin KPI orchestration
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Phân bổ chỉ tiêu KPI theo người, sản phẩm và tăng ròng</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Giao mục tiêu cho từng chuyên viên theo kỳ KPI, bám đúng dữ liệu mà báo cáo GAS đang sử dụng. Nếu bạn mới mở rộng schema, hãy chạy migration target mới trước khi lưu.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreatePlan(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Tạo kỳ KPI
              </button>
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
            <div className="mb-3 inline-flex rounded-2xl bg-violet-50 p-2 text-violet-600">
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
            <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(135deg,_rgba(254,243,199,0.72),_rgba(255,255,255,0.92))] p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-amber-500/15 p-2.5 text-amber-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Lưu ý khi mở rộng KPI</p>
                  <p className="text-sm text-slate-600">Target chi tiết theo sản phẩm cần migration mới trong `plan_assignments`.</p>
                </div>
              </div>
              <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-600 ring-1 ring-white/70">
                Nếu bạn vừa thêm các cột target mới, hãy chạy file `migration_plan_assignment_product_targets.sql` trước khi bấm lưu để tránh lỗi schema.
              </div>
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 2xl:grid-cols-2">
          {filteredUsers.map((profile) => {
            const draft = drafts[profile.id] || DEFAULT_DRAFT
            const saving = savingUserId === profile.id
            const currentAssignment = assignmentMap[profile.id]
            const dirty = !draftsEqual(draft, buildDraft(currentAssignment))
            return (
              <article key={profile.id} className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
                <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.95),_rgba(255,255,255,0.88))] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-lg">
                        {profile.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{profile.full_name}</h3>
                          <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold", dirty ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700")}>
                            {dirty ? "Chưa lưu" : "Đã đồng bộ"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            <Building2 className="h-3.5 w-3.5" />
                            {profile.department_id || "Chưa có phòng ban"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            <Target className="h-3.5 w-3.5" />
                            {countConfiguredTargets(draft)} chỉ tiêu đã nhập
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200/70">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Vay thực tế</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompact(Number(currentAssignment?.actual_loans_amount || 0))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Gửi thực tế</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompact(Number(currentAssignment?.actual_deposits_amount || 0))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">Gọi thực tế</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{formatCompact(Number(currentAssignment?.actual_calls || 0))}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <MetricSection
                    title="Chỉ tiêu trọng tâm"
                    icon={<LineChart className="h-4 w-4" />}
                    fields={CORE_FIELDS}
                    draft={draft}
                    onChange={(key, value) => handleDraftChange(profile.id, key, value)}
                  />
                  <MetricSection
                    title="Sản phẩm / dịch vụ"
                    icon={<Sparkles className="h-4 w-4" />}
                    fields={PRODUCT_FIELDS}
                    draft={draft}
                    onChange={(key, value) => handleDraftChange(profile.id, key, value)}
                  />
                  <MetricSection
                    title="Chỉ tiêu tăng ròng"
                    icon={<TrendingUp className="h-4 w-4" />}
                    fields={GROWTH_FIELDS}
                    draft={draft}
                    onChange={(key, value) => handleDraftChange(profile.id, key, value)}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-500">
                    {selectedPlan ? `Đang giao cho kỳ ${selectedPlan.title}` : "Chưa chọn kỳ KPI"}
                  </div>
                  <button
                    onClick={() => handleSaveUser(profile)}
                    disabled={saving || !selectedPlanId}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu cho {profile.full_name.split(" ").slice(-1)[0]}
                  </button>
                </div>
              </article>
            )
          })}
        </section>

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
    </DashboardLayout>
  )
}
