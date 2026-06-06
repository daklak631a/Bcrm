"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import clsx from "clsx"
import {
  ArrowUp,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { loadPilotSnapshot, savePilotSnapshot } from "@/lib/advanced-workflow-pilot/pilot-store"
import {
  mapAdminTemplateToPilotTemplate,
  mergeTemplatesById,
  templateAdminStorageKey,
  type AdminProjectTemplate,
} from "@/lib/advanced-workflow-pilot/template-admin-store"
import { createNotification, fetchProfiles } from "@/lib/supabase/api"
import { useAuthStore } from "@/store/useAuthStore"

type WorkflowDirection = "bottom_up" | "top_down" | "hybrid"
type WorkflowStatus = "reviewing" | "executing" | "blocked" | "completed"
type StepStatus = "done" | "active" | "waiting" | "blocked"
type PhaseStatus = "done" | "active" | "risk" | "planned"
type CardStatus = "todo" | "doing" | "review" | "done"
type WorkspaceSection = "gantt" | "kanban" | "task-detail" | "task-forms" | "task-discussion"
type TemplateStatus = "draft" | "lv2_review" | "lv1_review" | "published" | "returned"

interface WorkflowStep {
  id: string
  order: number
  title: string
  actor: string
  unit: string
  level: string
  status: StepStatus
  due: string
  note: string
}

interface WorkflowInstance {
  id: string
  code: string
  title: string
  customer: string
  workflowType: "Dự án" | "Đề xuất" | "Yêu cầu hỗ trợ"
  direction: WorkflowDirection
  status: WorkflowStatus
  initiator: string
  ownerUnit: string
  due: string
  summary: string
  currentStepId: string
}

interface Phase {
  id: string
  workflowId: string
  title: string
  owner: string
  ownerUserId?: string
  receiver: string
  receiverUserId?: string
  handoffTo: string
  handoffToUserId?: string
  participants: string[]
  participantUserIds?: string[]
  supporters: string[]
  supporterUserIds?: string[]
  start: number
  span: number
  progress: number
  status: PhaseStatus
  acceptance: string
}

interface WorkCard {
  id: string
  workflowId: string
  phaseId: string
  title: string
  status: CardStatus
  assignee: string
  assigneeUserId?: string
  supervisors: string[]
  supervisorUserIds?: string[]
  participants: string[]
  participantUserIds?: string[]
  approvers: string[]
  approverUserIds?: string[]
  due: string
  priority: "Thấp" | "Trung bình" | "Cao"
  checklist: Array<{ text: string; doneByExecutor: boolean; approvedBySupervisor: boolean }>
  formChecks?: Array<{ text: string; type: "Biểu mẫu" | "Hồ sơ" | "Sticknote"; checked: boolean }>
  comments: Array<{ author: string; text: string }>
  createdBy?: string
}

interface ProjectTemplate {
  id: string
  name: string
  scope: string
  category: "CRM" | "Hạn mức" | "Triển khai sản phẩm" | "Khác"
  direction: WorkflowDirection
  version: number
  createdBy: string
  updatedAt: string
  status: TemplateStatus
  approvalNote: string
  phaseCount: number
  lv2Approved: boolean
  lv1Approved: boolean
  phases: Array<{
    title: string
    span: number
    owner: string
    receiver: string
    handoffTo: string
    acceptance: string
    timeline: string[]
    checklists: string[]
    forms?: string[]
    attachments?: string[]
    stickNotes?: string[]
  }>
}

interface PhaseTimelineItem {
  id: string
  title: string
  owner: string
  ownerUserId?: string
  participants: string[]
  participantUserIds?: string[]
  supporters: string[]
  supporterUserIds?: string[]
  startDate: string
  endDate: string
  status: "Chờ làm" | "Đang làm" | "Hoàn thành"
}

interface PilotSnapshot {
  version: 1
  savedAt: string
  selectedWorkflowId: string
  selectedPhaseId: string
  selectedTimelineItemId: string
  selectedCardId: string
  createdWorkflow: WorkflowInstance | null
  createdStepsByWorkflow: Record<string, WorkflowStep[]>
  phasesByWorkflow: Record<string, Phase[]>
  phaseTimelines: Record<string, PhaseTimelineItem[]>
  cards: WorkCard[]
}

const pilotStorageKey = "bcrm-advanced-workflow-pilot:v1"

const workflows: WorkflowInstance[] = []

const stepsByWorkflow: Record<string, WorkflowStep[]> = {}

const initialPhases: Record<string, Phase[]> = {}

const initialCards: WorkCard[] = []

const cardColumns: Array<{ key: CardStatus; title: string }> = [
  { key: "todo", title: "Chờ nhận" },
  { key: "doing", title: "Đang làm" },
  { key: "review", title: "Chờ duyệt" },
  { key: "done", title: "Hoàn thành" },
]

let workspaceUserOptions: string[] = []
let workspaceProfilesByKey = new Map<string, { id: string; full_name?: string; email?: string }>()
let workspaceProfilesById = new Map<string, { id: string; full_name?: string; email?: string }>()

function getProfileDisplayName(profile: { id: string; full_name?: string; email?: string }) {
  return profile.full_name || profile.email || profile.id
}

function getUserIdFromName(name: string) {
  return workspaceProfilesByKey.get(name.trim().toLowerCase())?.id || ""
}

function getUserNameFromId(userId?: string, fallback = "") {
  if (!userId) return fallback
  const profile = workspaceProfilesById.get(userId)
  return profile ? getProfileDisplayName(profile) : fallback || userId
}

function getUserNamesFromIds(userIds?: string[], fallback: string[] = []) {
  if (!userIds?.length) return fallback
  return userIds.map((userId, index) => getUserNameFromId(userId, fallback[index] || userId))
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return "Chưa đặt thời gian"
  if (startDate && endDate) return `${startDate} → ${endDate}`
  return startDate || endDate || "Chưa đặt thời gian"
}

function durationInDays(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return null
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function timelineDateMeta(item: Pick<PhaseTimelineItem, "startDate" | "endDate">) {
  const range = formatDateRange(item.startDate, item.endDate)
  const duration = durationInDays(item.startDate, item.endDate)
  return duration ? `${range} · ${duration} ngày` : range
}

function parseLocalDate(value?: string) {
  if (!value) return null
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setHours(0, 0, 0, 0)
  next.setDate(next.getDate() + diff)
  return next
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(date)
}

function overlapsDateRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date) {
  return start <= rangeEnd && end >= rangeStart
}

function daysBetween(start: Date, end: Date) {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000)
}

function clampDate(date: Date, min: Date, max: Date) {
  if (date < min) return min
  if (date > max) return max
  return date
}

function createDefaultFormChecks(seed: { forms?: string[]; attachments?: string[]; stickNotes?: string[] } = {}): WorkCard["formChecks"] {
  const forms = seed.forms?.length ? seed.forms : ["Biểu mẫu xử lý công việc"]
  const attachments = seed.attachments?.length ? seed.attachments : ["Hồ sơ đính kèm"]
  const stickNotes = seed.stickNotes?.length ? seed.stickNotes : ["Sticknote kiểm tra trước khi chuyển bước"]
  return [
    ...forms.map((text) => ({ text, type: "Biểu mẫu" as const, checked: false })),
    ...attachments.map((text) => ({ text, type: "Hồ sơ" as const, checked: false })),
    ...stickNotes.map((text) => ({ text, type: "Sticknote" as const, checked: false })),
  ]
}

function idsFromNames(names: string[] = []) {
  return names.map(getUserIdFromName).filter(Boolean)
}

function includesCurrentUser(userIds: string[] = [], currentUserId = "") {
  return Boolean(currentUserId && userIds.includes(currentUserId))
}

const projectTemplates: ProjectTemplate[] = [
  {
    id: "tpl-crm-implementation",
    name: "Triển khai CRM B2B",
    scope: "Dùng cho dự án CRM có khảo sát, chuẩn hóa dữ liệu, cấu hình, UAT và nghiệm thu.",
    category: "CRM",
    direction: "hybrid",
    version: 2,
    createdBy: "Admin LV1",
    updatedAt: "01/06/2026",
    status: "published",
    approvalNote: "Đã được LV2 và LV1 đồng thuận dùng làm mẫu triển khai CRM.",
    phaseCount: 5,
    lv2Approved: true,
    lv1Approved: true,
    phases: [
      { title: "Khảo sát phạm vi", span: 2, owner: "Tổ CRM", receiver: "Trưởng phòng KHDN", handoffTo: "Khối CNTT", acceptance: "Chốt phạm vi triển khai, danh sách người dùng và đầu mối nghiệp vụ.", timeline: ["Gặp đầu mối khách hàng", "Chốt danh sách người dùng"], checklists: ["Có phạm vi triển khai", "Có người giám sát nghiệp vụ"], forms: ["Biểu mẫu khảo sát hiện trạng", "Danh sách người dùng", "Phiếu xác nhận phạm vi"], attachments: ["File danh sách người dùng", "Sơ đồ quy trình hiện tại"], stickNotes: ["Kiểm tra đã có đầu mối nghiệp vụ", "Không chuyển bước nếu chưa khóa phạm vi"] },
      { title: "Chuẩn bị dữ liệu", span: 3, owner: "Chi nhánh", receiver: "Tổ CRM", handoffTo: "Khối CNTT", acceptance: "Dữ liệu nguồn có người xác nhận và đủ điều kiện cấu hình.", timeline: ["Xuất dữ liệu khách hàng", "Làm sạch mã số thuế"], checklists: ["Có file dữ liệu nguồn", "Có người xác nhận dữ liệu"], forms: ["Bảng ánh xạ dữ liệu", "Biên bản xác nhận dữ liệu"], attachments: ["File dữ liệu khách hàng nguồn", "Danh sách trường dữ liệu"], stickNotes: ["Kiểm tra mã số thuế trùng", "Có người chịu trách nhiệm dữ liệu"] },
      { title: "Cấu hình hệ thống", span: 4, owner: "Khối CNTT", receiver: "Tổ CRM", handoffTo: "Chi nhánh", acceptance: "Pipeline, quyền và cấu hình phân hệ sẵn sàng cho UAT.", timeline: ["Tạo pipeline dự án", "Cấu hình quyền"], checklists: ["Có role theo giai đoạn", "Có pipeline bán hàng dự án"], forms: ["Mẫu luồng bán hàng", "Mẫu phân quyền", "Danh sách kiểm tra cấu hình"], attachments: ["Ảnh chụp cấu hình pipeline", "Bảng phân quyền user"], stickNotes: ["Kiểm tra quyền theo vai trò", "Có môi trường thử trước UAT"] },
      { title: "Đào tạo và kiểm thử", span: 3, owner: "Chi nhánh", receiver: "Khối CNTT", handoffTo: "Khách hàng", acceptance: "User hoàn tất UAT, lỗi tồn được ghi nhận và phân loại.", timeline: ["Đào tạo user", "Chạy UAT"], checklists: ["Có danh sách user dự UAT", "Có biên bản lỗi tồn"], forms: ["Biên bản đào tạo", "Phiếu tình huống kiểm thử", "Biên bản kiểm thử"], attachments: ["Danh sách user tham gia UAT", "File tổng hợp lỗi tồn"], stickNotes: ["Phân loại lỗi nghiêm trọng trước nghiệm thu"] },
      { title: "Nghiệm thu", span: 2, owner: "Khách hàng", receiver: "Chi nhánh", handoffTo: "Đầu mối vận hành", acceptance: "Có biên bản nghiệm thu và đầu mối nhận bàn giao vận hành.", timeline: ["Chốt biên bản nghiệm thu", "Bàn giao vận hành"], checklists: ["Có biên bản nghiệm thu", "Có người nhận bàn giao"], forms: ["Biên bản nghiệm thu", "Biên bản bàn giao vận hành"], attachments: ["File biên bản nghiệm thu đã ký", "Danh sách việc tồn"], stickNotes: ["Chỉ đóng dự án khi có người nhận vận hành"] },
    ],
  },
  {
    id: "tpl-credit-limit",
    name: "Đề xuất hạn mức nhiều cấp",
    scope: "Dùng cho hồ sơ hạn mức cần bổ sung chứng từ, kiểm tra chi nhánh và phê duyệt hội sở.",
    category: "Hạn mức",
    direction: "bottom_up",
    version: 1,
    createdBy: "Admin LV2",
    updatedAt: "25/05/2026",
    status: "lv1_review",
    approvalNote: "LV2 đã duyệt; đang chờ LV1 xác nhận trước khi xuất bản.",
    phaseCount: 3,
    lv2Approved: true,
    lv1Approved: false,
    phases: [
      { title: "Bổ sung hồ sơ", span: 2, owner: "Cán bộ phụ trách", receiver: "Trưởng phòng KHDN", handoffTo: "Giám đốc CN", acceptance: "Hồ sơ dòng tiền và tài sản bảo đảm đủ để trình chi nhánh.", timeline: ["Thu báo cáo dòng tiền", "Bổ sung tài sản bảo đảm"], checklists: ["Có dòng tiền 6 tháng", "Có xác nhận tài sản bảo đảm"], forms: ["Danh sách kiểm tra tín dụng", "Phiếu bổ sung hồ sơ"], attachments: ["Báo cáo dòng tiền 6 tháng", "Giấy xác nhận tài sản bảo đảm"], stickNotes: ["Kiểm tra đủ hồ sơ trước khi trình duyệt"] },
      { title: "Kiểm tra chi nhánh", span: 2, owner: "Giám đốc CN", receiver: "Cán bộ phụ trách", handoffTo: "Khối tín dụng", acceptance: "Chi nhánh có ý kiến chính thức và bộ hồ sơ gửi hội sở.", timeline: ["Kiểm tra hồ sơ", "Trình hội sở"], checklists: ["Chi nhánh xác nhận hồ sơ", "Có ý kiến giám đốc CN"], forms: ["Biên bản ý kiến chi nhánh", "Phiếu trình hội sở"], attachments: ["Ý kiến giám đốc chi nhánh", "Hồ sơ rủi ro"], stickNotes: ["Khóa sửa hồ sơ sau khi gửi hội sở"] },
      { title: "Phê duyệt hội sở", span: 3, owner: "Khối tín dụng", receiver: "Giám đốc CN", handoffTo: "Ban điều hành", acceptance: "Có quyết định hạn mức và điều kiện giải ngân kèm theo.", timeline: ["Thẩm định hội sở", "Ra quyết định hạn mức"], checklists: ["Có kết quả thẩm định", "Có quyết định phê duyệt"], forms: ["Phiếu thẩm định", "Quyết định hạn mức"], attachments: ["Kết quả thẩm định hội sở", "Quyết định phê duyệt"], stickNotes: ["Phản hồi rõ điều kiện giải ngân về chi nhánh"] },
    ],
  },
]

const initialPhaseTimelines: Record<string, PhaseTimelineItem[]> = {}

function loadAdminPilotTemplates() {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(templateAdminStorageKey)
    if (!raw) return []
    const adminTemplates = JSON.parse(raw) as AdminProjectTemplate[]
    if (!Array.isArray(adminTemplates)) return []
    return adminTemplates.map(mapAdminTemplateToPilotTemplate) as ProjectTemplate[]
  } catch {
    window.localStorage.removeItem(templateAdminStorageKey)
    return []
  }
}

function directionLabel(direction: WorkflowDirection) {
  if (direction === "bottom_up") return "Đi lên"
  if (direction === "top_down") return "Đi xuống"
  return "Hỗn hợp"
}

function statusLabel(status: WorkflowStatus | StepStatus | PhaseStatus | CardStatus) {
  switch (status) {
    case "done":
    case "completed":
      return "Hoàn thành"
    case "todo":
      return "Chờ nhận"
    case "doing":
      return "Đang làm"
    case "review":
      return "Chờ duyệt"
    case "active":
    case "executing":
      return "Đang xử lý"
    case "reviewing":
      return "Đang phê duyệt"
    case "blocked":
    case "risk":
      return "Có vấn đề"
    case "planned":
      return "Dự kiến"
    case "waiting":
      return "Chờ mở"
  }
}

function statusTone(status: WorkflowStatus | StepStatus | PhaseStatus) {
  switch (status) {
    case "done":
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"
    case "active":
    case "executing":
    case "reviewing":
      return "border-sky-200 bg-sky-50 text-sky-700"
    case "blocked":
    case "risk":
      return "border-rose-200 bg-rose-50 text-rose-700"
    default:
      return "border-slate-200 bg-slate-50 text-slate-600"
  }
}

function ganttBarTone(status: PhaseStatus) {
  switch (status) {
    case "done":
      return "bg-[#006b68] shadow-[0_6px_14px_rgba(0,107,104,0.22)]"
    case "active":
      return "bg-emerald-500 shadow-[0_6px_16px_rgba(16,185,129,0.24)]"
    case "risk":
      return "bg-rose-800 shadow-[0_6px_14px_rgba(159,18,57,0.24)]"
    case "planned":
      return "bg-slate-300 ring-1 ring-slate-400"
  }
}

function ganttLegendTone(status: PhaseStatus) {
  switch (status) {
    case "done":
      return "bg-[#006b68]"
    case "active":
      return "bg-emerald-500"
    case "risk":
      return "bg-rose-800"
    case "planned":
      return "bg-slate-300 ring-1 ring-slate-400"
  }
}

function nextCardStatus(status: CardStatus, direction: 1 | -1) {
  const order: CardStatus[] = ["todo", "doing", "review", "done"]
  const index = order.indexOf(status)
  return order[Math.max(0, Math.min(order.length - 1, index + direction))]
}

export default function AdvancedWorkflowPilotPage() {
  const { user } = useAuthStore()
  const [query, setQuery] = useState("")
  const [selectedWorkflowId, setSelectedWorkflowId] = useState("")
  const [activeSection, setActiveSection] = useState<WorkspaceSection>("gantt")
  const [mobileGanttTimelineOpen, setMobileGanttTimelineOpen] = useState(false)
  const [createdWorkflow, setCreatedWorkflow] = useState<WorkflowInstance | null>(null)
  const [createdStepsByWorkflow, setCreatedStepsByWorkflow] = useState<Record<string, WorkflowStep[]>>({})
  const [phasesByWorkflow, setPhasesByWorkflow] = useState(initialPhases)
  const [phaseTimelines, setPhaseTimelines] = useState(initialPhaseTimelines)
  const [cards, setCards] = useState(initialCards)
  const [templates, setTemplates] = useState(projectTemplates)
  const [selectedPhaseId, setSelectedPhaseId] = useState("")
  const [editingPhaseId, setEditingPhaseId] = useState("")
  const [selectedTimelineItemId, setSelectedTimelineItemId] = useState("")
  const [selectedCardId, setSelectedCardId] = useState("")
  const [newCardTitle, setNewCardTitle] = useState("")
  const [newChecklist, setNewChecklist] = useState("")
  const [newComment, setNewComment] = useState("")
  const [pilotHydrated, setPilotHydrated] = useState(false)
  const [adminTemplatesMerged, setAdminTemplatesMerged] = useState(false)
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name?: string; email?: string }>>([])

  useEffect(() => {
    let mounted = true

    const applySnapshot = (snapshot: PilotSnapshot) => {
      if (snapshot.version !== 1) return
      const persistedWorkflow = snapshot.createdWorkflow || null
      const persistedWorkflowId = persistedWorkflow?.id || ""
      const persistedPhases = persistedWorkflowId ? { [persistedWorkflowId]: snapshot.phasesByWorkflow?.[persistedWorkflowId] || [] } : initialPhases
      const persistedPhaseTimelines = persistedWorkflowId
        ? Object.fromEntries(Object.keys(snapshot.phaseTimelines || {}).filter((phaseId) => persistedPhases[persistedWorkflowId]?.some((phase) => phase.id === phaseId)).map((phaseId) => [phaseId, snapshot.phaseTimelines[phaseId]]))
        : initialPhaseTimelines
      const persistedCards = persistedWorkflowId ? (snapshot.cards || []).filter((card) => card.workflowId === persistedWorkflowId) : initialCards

      setSelectedWorkflowId(persistedWorkflowId || "")
      setSelectedPhaseId(snapshot.selectedPhaseId || persistedPhases[persistedWorkflowId]?.[0]?.id || "")
      setSelectedTimelineItemId(snapshot.selectedTimelineItemId || "")
      setSelectedCardId(snapshot.selectedCardId || persistedCards[0]?.id || "")
      setCreatedWorkflow(persistedWorkflow)
      setCreatedStepsByWorkflow(persistedWorkflowId ? { [persistedWorkflowId]: snapshot.createdStepsByWorkflow?.[persistedWorkflowId] || [] } : {})
      setPhasesByWorkflow(persistedPhases)
      setPhaseTimelines(persistedPhaseTimelines)
      setCards(persistedCards)
      setTemplates(mergeTemplatesById(projectTemplates, loadAdminPilotTemplates()))
    }

    const hydrate = async () => {
      try {
        const remote = await loadPilotSnapshot<PilotSnapshot>(pilotStorageKey)
        if (!mounted) return
        if (remote.payload) {
          applySnapshot(remote.payload)
          return
        }

        const raw = window.localStorage.getItem(pilotStorageKey)
        if (raw) {
          applySnapshot(JSON.parse(raw) as PilotSnapshot)
        }
      } catch {
        window.localStorage.removeItem(pilotStorageKey)
      } finally {
        if (mounted) setPilotHydrated(true)
      }
    }

    hydrate()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    fetchProfiles()
      .then((rows) => {
        if (mounted) {
          setProfiles(rows || [])
        }
      })
      .catch(() => {
        if (mounted) {
          setProfiles([])
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!pilotHydrated || adminTemplatesMerged) return
    const adminTemplates = loadAdminPilotTemplates()
    if (adminTemplates.length > 0) {
      setTemplates((current) => mergeTemplatesById(current, adminTemplates))
    }
    setAdminTemplatesMerged(true)
  }, [pilotHydrated, adminTemplatesMerged])

  useEffect(() => {
    if (!pilotHydrated) return
    const snapshot: PilotSnapshot = {
      version: 1,
      savedAt: new Date().toLocaleString("vi-VN"),
      selectedWorkflowId,
      selectedPhaseId,
      selectedTimelineItemId,
      selectedCardId,
      createdWorkflow,
      createdStepsByWorkflow,
      phasesByWorkflow,
      phaseTimelines,
      cards,
    }
    window.localStorage.setItem(pilotStorageKey, JSON.stringify(snapshot))
    savePilotSnapshot(pilotStorageKey, snapshot)
  }, [
    pilotHydrated,
    selectedWorkflowId,
    selectedPhaseId,
    selectedTimelineItemId,
    selectedCardId,
    createdWorkflow,
    createdStepsByWorkflow,
    phasesByWorkflow,
    phaseTimelines,
    cards,
  ])

  useEffect(() => {
    if (!pilotHydrated) return
    const params = new URLSearchParams(window.location.search)
    if (params.get("created") !== "1") return

    const projectName = params.get("projectName") || "Dự án mới"
    const customerName = params.get("customerName") || "Khách hàng đã chọn"
    const templateId = params.get("templateId") || "blank"
    const selectedTemplate = templates.find((template) => template.id === templateId && template.status === "published" && template.lv1Approved && template.lv2Approved)
    const direction = selectedTemplate?.direction || ((params.get("direction") || "bottom_up") as WorkflowDirection)
    const startLevel = params.get("startLevel") || "Cán bộ"
    const targetLevel = params.get("targetLevel") || "Lãnh đạo hội sở"
    const firstMembers = params.get("firstMembers") || "Chưa phân công"
    const note = params.get("note") || "Dự án được tạo từ ghi nhận bán hàng."
    const workflowId = "wf-created-project"
    const firstPhaseId = "created-kickoff"
    let phaseStart = 1
    const generatedPhases: Phase[] = selectedTemplate
      ? selectedTemplate.phases.map((phase, index) => {
          const start = phaseStart
          phaseStart += phase.span
          return {
            id: `created-phase-${index + 1}`,
            workflowId,
            title: phase.title,
            owner: phase.owner,
            receiver: phase.receiver,
            handoffTo: phase.handoffTo,
            participants: [],
            supporters: [phase.receiver],
            start,
            span: phase.span,
            progress: index === 0 ? 0 : 0,
            status: index === 0 ? "planned" : "planned",
            acceptance: phase.acceptance,
          }
        })
      : [
          {
            id: firstPhaseId,
            workflowId,
            title: "Khởi tạo và phân công",
            owner: firstMembers,
            receiver: targetLevel,
            handoffTo: "Cấp phê duyệt kế tiếp",
            participants: firstMembers.split(",").map((item) => item.trim()).filter(Boolean),
            supporters: [targetLevel],
            start: 1,
            span: 2,
            progress: 0,
            status: "planned",
            acceptance: "Có người phụ trách, người giám sát, danh sách thành viên và điều kiện bàn giao giai đoạn.",
          },
        ]
    const generatedTimelines: Record<string, PhaseTimelineItem[]> = selectedTemplate
      ? Object.fromEntries(selectedTemplate.phases.map((phase, phaseIndex) => [
          `created-phase-${phaseIndex + 1}`,
          phase.timeline.map((title, timelineIndex) => ({
            id: `created-phase-${phaseIndex + 1}-tl-${timelineIndex + 1}`,
            title,
            owner: phase.owner,
            participants: [],
            supporters: [phase.receiver],
            startDate: "",
            endDate: "",
            status: "Chờ làm" as const,
          })),
        ]))
      : {
          [firstPhaseId]: [
            { id: "created-tl-1", title: "Chốt người phụ trách giai đoạn", owner: firstMembers, participants: firstMembers.split(",").map((item) => item.trim()).filter(Boolean), supporters: [targetLevel], startDate: "", endDate: "", status: "Chờ làm" },
            { id: "created-tl-2", title: "Xác nhận điều kiện bàn giao", owner: targetLevel, participants: [], supporters: [firstMembers], startDate: "", endDate: "", status: "Chờ làm" },
          ],
        }
    const generatedCards: WorkCard[] = selectedTemplate
      ? selectedTemplate.phases.map((phase, index) => ({
          id: `created-card-${index + 1}`,
          workflowId,
          phaseId: `created-phase-${index + 1}`,
          title: phase.timeline[0] || phase.title,
          status: index === 0 ? "todo" : "todo",
          assignee: phase.owner,
          supervisors: [phase.receiver],
          approvers: [phase.handoffTo],
          participants: firstMembers.split(",").map((item) => item.trim()).filter(Boolean),
          due: "Chưa đặt hạn",
          priority: index === 0 ? "Cao" : "Trung bình",
          checklist: phase.checklists.map((text) => ({ text, doneByExecutor: false, approvedBySupervisor: false })),
          formChecks: createDefaultFormChecks({ forms: phase.forms, attachments: phase.attachments, stickNotes: phase.stickNotes }),
          comments: [{ author: "Hệ thống", text: `Tạo từ template: ${selectedTemplate.name}. ${note}` }],
          createdBy: startLevel,
        }))
      : [
          {
            id: "created-card-1",
            workflowId,
            phaseId: firstPhaseId,
            title: "Xác nhận phạm vi và thành viên giai đoạn đầu",
            status: "todo",
            assignee: firstMembers,
            supervisors: [targetLevel],
            approvers: [targetLevel],
            participants: firstMembers.split(",").map((item) => item.trim()).filter(Boolean),
            due: "Chưa đặt hạn",
            priority: "Cao",
            checklist: [
              { text: "Có tên dự án", doneByExecutor: true, approvedBySupervisor: true },
              { text: "Có khách hàng liên quan", doneByExecutor: true, approvedBySupervisor: true },
              { text: "Có người giám sát giai đoạn", doneByExecutor: false, approvedBySupervisor: false },
              { text: "Có điều kiện bàn giao", doneByExecutor: false, approvedBySupervisor: false },
            ],
            formChecks: createDefaultFormChecks({ forms: ["Thông tin dự án", "Thông tin khách hàng"], attachments: ["Biên bản phân công"], stickNotes: ["Kiểm tra đủ người phụ trách trước khi mở giai đoạn"] }),
            comments: [{ author: "Hệ thống", text: note }],
            createdBy: startLevel,
          },
        ]

    const workflow: WorkflowInstance = {
      id: workflowId,
      code: "WF-PILOT",
      title: projectName,
      customer: customerName,
      workflowType: "Dự án",
      direction,
      status: "reviewing",
      initiator: startLevel,
      ownerUnit: "Tạo từ ghi nhận bán hàng",
      due: "Chưa đặt hạn tổng",
      summary: selectedTemplate
        ? `Dự án tạo từ bán hàng, áp dụng template ${selectedTemplate.name}. Chu trình bắt đầu ở ${startLevel} và đi tới ${targetLevel} trước khi triển khai theo từng giai đoạn.`
        : `Dự án vừa được tạo từ bán hàng. Chu trình bắt đầu ở ${startLevel} và đi tới ${targetLevel} trước khi mở triển khai.`,
      currentStepId: "created-step-1",
    }

    setCreatedWorkflow(workflow)
    setCreatedStepsByWorkflow({
      [workflowId]: [
        { id: "created-step-1", order: 1, title: "Ghi nhận dự án từ bán hàng", actor: startLevel, unit: "CRM", level: startLevel, status: "active", due: "Chưa đặt hạn", note: "Tạo hồ sơ dự án gắn với khách hàng và ghi chú tên dự án." },
        { id: "created-step-2", order: 2, title: `Trình tới ${targetLevel}`, actor: targetLevel, unit: "Cấp phê duyệt", level: targetLevel, status: "waiting", due: "Chưa đặt hạn", note: "Cấp tiếp theo đồng ý thì mới mở bước triển khai tiếp theo." },
        { id: "created-step-3", order: 3, title: "Mở workspace triển khai", actor: firstMembers, unit: "Nhóm dự án", level: "Người thực hiện", status: "waiting", due: "Chưa đặt hạn", note: "Sau khi phê duyệt, nhóm dự án tạo timeline, Gantt, Kanban và bàn giao theo từng giai đoạn." },
      ],
    })
    setPhasesByWorkflow((current) => ({
      ...current,
      [workflowId]: generatedPhases,
    }))
    setPhaseTimelines((current) => ({
      ...current,
      ...generatedTimelines,
    }))
    setCards((current) => [
      ...generatedCards,
      ...current.filter((card) => card.workflowId !== workflowId),
    ])
    setSelectedWorkflowId(workflowId)
    setSelectedPhaseId(generatedPhases[0]?.id || firstPhaseId)
    setSelectedTimelineItemId(generatedTimelines[generatedPhases[0]?.id || firstPhaseId]?.[0]?.id || "")
    setSelectedCardId(generatedCards[0]?.id || "")
  }, [pilotHydrated, adminTemplatesMerged, templates])

  const profileDirectory = useMemo(() => {
    const byKey = new Map<string, { id: string; full_name?: string; email?: string }>()
    const byId = new Map<string, { id: string; full_name?: string; email?: string }>()
    profiles.forEach((profile) => {
      byId.set(profile.id, profile)
      const keys = [profile.id, profile.full_name, profile.email]
      keys
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase())
        .forEach((key) => {
          if (!byKey.has(key)) {
            byKey.set(key, profile)
          }
        })
    })
    return { byKey, byId }
  }, [profiles])
  workspaceUserOptions = useMemo(() => profiles.map(getProfileDisplayName), [profiles])
  workspaceProfilesByKey = profileDirectory.byKey
  workspaceProfilesById = profileDirectory.byId
  const currentActorName = user?.full_name || user?.name || user?.email || "Hệ thống"
  const currentActorId = user?.id || ""
  const allWorkflows = useMemo(() => createdWorkflow ? [createdWorkflow, ...workflows] : workflows, [createdWorkflow])
  const canSeeAllWorkflows = user?.role === "ADMIN_LEVEL_1"
  const visibleWorkflows = useMemo(() => {
    if (canSeeAllWorkflows) return allWorkflows
    if (!currentActorId) return []

    const currentProfile = profileDirectory.byId.get(currentActorId)
    const currentNameKeys = [currentActorId, currentProfile?.full_name, currentProfile?.email, user?.full_name, user?.name, user?.email]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase())

    const matchesCurrentUserName = (name?: string) => {
      const key = name?.trim().toLowerCase()
      return Boolean(key && currentNameKeys.includes(key))
    }

    return allWorkflows.filter((workflow) => {
      const workflowPhases = phasesByWorkflow[workflow.id] || []
      const workflowPhaseIds = workflowPhases.map((phase) => phase.id)
      const workflowTimelineItems = workflowPhaseIds.flatMap((phaseId) => phaseTimelines[phaseId] || [])
      const workflowCards = cards.filter((card) => card.workflowId === workflow.id)

      if (matchesCurrentUserName(workflow.initiator)) return true

      const relatedUserIds = [
        ...idsFromNames([workflow.initiator]),
        ...workflowPhases.flatMap((phase) => [
          phase.ownerUserId,
          phase.receiverUserId,
          phase.handoffToUserId,
          ...(phase.participantUserIds || []),
          ...(phase.supporterUserIds || []),
          ...idsFromNames([phase.owner, phase.receiver, phase.handoffTo, ...(phase.participants || []), ...(phase.supporters || [])]),
        ]),
        ...workflowTimelineItems.flatMap((item) => [
          item.ownerUserId,
          ...(item.participantUserIds || []),
          ...(item.supporterUserIds || []),
          ...idsFromNames([item.owner, ...(item.participants || []), ...(item.supporters || [])]),
        ]),
        ...workflowCards.flatMap((card) => [
          card.assigneeUserId,
          ...(card.supervisorUserIds || []),
          ...(card.participantUserIds || []),
          ...(card.approverUserIds || []),
          ...idsFromNames([card.assignee, ...(card.supervisors || []), ...(card.participants || []), ...(card.approvers || [])]),
        ]),
      ].filter(Boolean) as string[]

      return includesCurrentUser(relatedUserIds, currentActorId)
    })
  }, [allWorkflows, canSeeAllWorkflows, cards, currentActorId, phaseTimelines, phasesByWorkflow, profileDirectory.byId, user?.email, user?.full_name, user?.name])
  const selectedWorkflow = visibleWorkflows.find((item) => item.id === selectedWorkflowId) || visibleWorkflows[0]
  const phases = useMemo(() => selectedWorkflow ? phasesByWorkflow[selectedWorkflow.id] || [] : [], [selectedWorkflow, phasesByWorkflow])
  const selectedPhase = phases.find((phase) => phase.id === selectedPhaseId) || phases[0]
  const phaseCards = selectedWorkflow ? cards.filter((card) => card.workflowId === selectedWorkflow.id && card.phaseId === selectedPhase?.id) : []
  const selectedCard = phaseCards.find((card) => card.id === selectedCardId) || phaseCards[0]

  const filteredWorkflows = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return visibleWorkflows.filter((workflow) => !normalized || [
      workflow.title,
      workflow.customer,
      workflow.code,
      workflow.initiator,
      workflow.ownerUnit,
    ].some((value) => value.toLowerCase().includes(normalized)))
  }, [visibleWorkflows, query])

  const resolveNotificationRecipients = ({ userIds = [], names = [] }: { userIds?: string[]; names?: string[] }) => {
    const seen = new Set<string>()
    return [...userIds.map((userId) => profileDirectory.byId.get(userId)), ...names.map((name) => profileDirectory.byKey.get(name.trim().toLowerCase()))]
      .filter((profile): profile is { id: string; full_name?: string; email?: string } => Boolean(profile?.id))
      .filter((profile) => {
        if (profile.id === currentActorId || seen.has(profile.id)) return false
        seen.add(profile.id)
        return true
      })
  }

  const buildWorkflowLink = ({ workflowId, phaseId, cardId, timelineItemId }: { workflowId?: string; phaseId?: string; cardId?: string; timelineItemId?: string }) => {
    const params = new URLSearchParams()
    if (workflowId) params.set("workflowId", workflowId)
    if (phaseId) params.set("phaseId", phaseId)
    if (cardId) params.set("cardId", cardId)
    if (timelineItemId) params.set("timelineItemId", timelineItemId)
    const query = params.toString()
    return query ? `/advanced-workflow-pilot?${query}` : "/advanced-workflow-pilot"
  }

  const notifyRecipients = (recipientRef: { userIds?: string[]; names?: string[] }, payload: { title: string; message: string; type?: string; link_url?: string }) => {
    const recipients = resolveNotificationRecipients(recipientRef)
    if (recipients.length === 0) return

    recipients.forEach((recipient) => {
      void createNotification({
        user_id: recipient.id,
        title: payload.title,
        message: payload.message,
        type: payload.type || "project_workflow",
        link_url: payload.link_url || "/advanced-workflow-pilot",
      }).catch((error) => {
        console.error("Không tạo được notification:", error)
      })
    })
  }

  const notifyRoleAssignments = (beforeIds: string[] = [], afterIds: string[] = [], options: { title: string; message: (name: string) => string; link_url?: string }) => {
    const previous = new Set(beforeIds.filter(Boolean))
    const addedIds = afterIds.filter((item) => item && !previous.has(item))
    if (addedIds.length === 0) return
    notifyRecipients({ userIds: addedIds }, {
      title: options.title,
      message: addedIds.length === 1 ? options.message(getUserNameFromId(addedIds[0], addedIds[0])) : `${options.message(getUserNameFromId(addedIds[0], addedIds[0]))} và ${addedIds.length - 1} người khác.`,
      link_url: options.link_url,
    })
  }

  const selectWorkflow = useCallback((workflowId: string) => {
    const nextWorkflow = visibleWorkflows.find((item) => item.id === workflowId)
    const nextPhase = phasesByWorkflow[workflowId]?.[0]
    if (!nextWorkflow || !nextPhase) return
    setSelectedWorkflowId(workflowId)
    setSelectedPhaseId(nextPhase.id)
    setSelectedTimelineItemId(phaseTimelines[nextPhase.id]?.[0]?.id || "")
    setSelectedCardId(cards.find((card) => card.workflowId === workflowId && card.phaseId === nextPhase.id)?.id || "")
    setActiveSection("gantt")
  }, [visibleWorkflows, phasesByWorkflow, phaseTimelines, cards])

  useEffect(() => {
    if (profiles.length === 0) return

    setPhasesByWorkflow((current) => {
      let changed = false
      const next = Object.fromEntries(Object.entries(current).map(([workflowId, workflowPhases]) => [
        workflowId,
        workflowPhases.map((phase) => {
          const ownerUserId = phase.ownerUserId || getUserIdFromName(phase.owner)
          const receiverUserId = phase.receiverUserId || getUserIdFromName(phase.receiver)
          const handoffToUserId = phase.handoffToUserId || getUserIdFromName(phase.handoffTo)
          const participantUserIds = phase.participantUserIds?.length ? phase.participantUserIds : phase.participants.map(getUserIdFromName).filter(Boolean)
          const supporterUserIds = phase.supporterUserIds?.length ? phase.supporterUserIds : phase.supporters.map(getUserIdFromName).filter(Boolean)
          const nextPhase = {
            ...phase,
            owner: getUserNameFromId(ownerUserId, phase.owner),
            ownerUserId,
            receiver: getUserNameFromId(receiverUserId, phase.receiver),
            receiverUserId,
            handoffTo: getUserNameFromId(handoffToUserId, phase.handoffTo),
            handoffToUserId,
            participants: getUserNamesFromIds(participantUserIds, phase.participants),
            participantUserIds,
            supporters: getUserNamesFromIds(supporterUserIds, phase.supporters),
            supporterUserIds,
          }
          if (JSON.stringify(nextPhase) !== JSON.stringify(phase)) changed = true
          return nextPhase
        }),
      ]))
      return changed ? next : current
    })

    setPhaseTimelines((current) => {
      let changed = false
      const next = Object.fromEntries(Object.entries(current).map(([phaseId, items]) => [
        phaseId,
        items.map((item) => {
          const ownerUserId = item.ownerUserId || getUserIdFromName(item.owner)
          const participantUserIds = item.participantUserIds?.length ? item.participantUserIds : item.participants.map(getUserIdFromName).filter(Boolean)
          const supporterUserIds = item.supporterUserIds?.length ? item.supporterUserIds : item.supporters.map(getUserIdFromName).filter(Boolean)
          const nextItem = {
            ...item,
            owner: getUserNameFromId(ownerUserId, item.owner),
            ownerUserId,
            participants: getUserNamesFromIds(participantUserIds, item.participants),
            participantUserIds,
            supporters: getUserNamesFromIds(supporterUserIds, item.supporters),
            supporterUserIds,
          }
          if (JSON.stringify(nextItem) !== JSON.stringify(item)) changed = true
          return nextItem
        }),
      ]))
      return changed ? next : current
    })

    setCards((current) => {
      let changed = false
      const next = current.map((card) => {
        const assigneeUserId = card.assigneeUserId || getUserIdFromName(card.assignee)
        const supervisorUserIds = card.supervisorUserIds?.length ? card.supervisorUserIds : card.supervisors.map(getUserIdFromName).filter(Boolean)
        const participantUserIds = card.participantUserIds?.length ? card.participantUserIds : card.participants.map(getUserIdFromName).filter(Boolean)
        const approverUserIds = card.approverUserIds?.length ? card.approverUserIds : card.approvers.map(getUserIdFromName).filter(Boolean)
        const nextCard = {
          ...card,
          assignee: getUserNameFromId(assigneeUserId, card.assignee),
          assigneeUserId,
          supervisors: getUserNamesFromIds(supervisorUserIds, card.supervisors),
          supervisorUserIds,
          participants: getUserNamesFromIds(participantUserIds, card.participants),
          participantUserIds,
          approvers: getUserNamesFromIds(approverUserIds, card.approvers),
          approverUserIds,
        }
        if (JSON.stringify(nextCard) !== JSON.stringify(card)) changed = true
        return nextCard
      })
      return changed ? next : current
    })
  }, [profiles])

  useEffect(() => {
    if (!pilotHydrated || typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const workflowId = params.get("workflowId")
    const phaseId = params.get("phaseId")
    const cardId = params.get("cardId")
    const timelineItemId = params.get("timelineItemId")
    if (!workflowId && !phaseId && !cardId && !timelineItemId) return

    if (workflowId && workflowId !== selectedWorkflowId && visibleWorkflows.some((workflow) => workflow.id === workflowId)) {
      selectWorkflow(workflowId)
      return
    }
    if (phaseId && phases.some((phase) => phase.id === phaseId) && phaseId !== selectedPhaseId) {
      setSelectedPhaseId(phaseId)
    }
    if (cardId && cards.some((card) => card.id === cardId) && cardId !== selectedCardId) {
      setSelectedCardId(cardId)
    }
    const timelinePhaseId = phaseId || selectedPhaseId
    if (timelineItemId && timelinePhaseId && phaseTimelines[timelinePhaseId]?.some((item) => item.id === timelineItemId) && timelineItemId !== selectedTimelineItemId) {
      setSelectedTimelineItemId(timelineItemId)
    }
  }, [pilotHydrated, visibleWorkflows, selectedWorkflowId, phases, cards, phaseTimelines, selectedPhaseId, selectedCardId, selectedTimelineItemId, selectWorkflow])

  if (!selectedWorkflow) {
    return (
      <DashboardLayout title="Dự án">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Không gian dự án</p>
          <h1 className="mt-3 text-2xl font-bold text-slate-950">
            {canSeeAllWorkflows ? "Chưa có dự án vận hành" : "Bạn chưa tham gia dự án nào"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {canSeeAllWorkflows
              ? "Dự án sẽ xuất hiện khi được khởi tạo và có dữ liệu vận hành thực tế."
              : "Chỉ những dự án có bạn trong người phụ trách, người nhận, người tham gia, người hỗ trợ, giám sát hoặc phê duyệt mới hiển thị ở đây."}
          </p>
          {canSeeAllWorkflows && (
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="/sales" className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">
                Tạo từ bán hàng
              </a>
            </div>
          )}
        </div>
      </DashboardLayout>
    )
  }

  const updatePhase = (phaseId: string, patch: Partial<Phase>) => {
    const currentPhase = phases.find((phase) => phase.id === phaseId)
    if (!currentPhase) return
    const nextPhase = { ...currentPhase, ...patch }

    setPhasesByWorkflow((current) => ({
      ...current,
      [selectedWorkflow.id]: (current[selectedWorkflow.id] || []).map((phase) =>
        phase.id === phaseId ? nextPhase : phase
      ),
    }))

    const link_url = buildWorkflowLink({ workflowId: selectedWorkflow.id, phaseId })
    if (patch.owner && patch.owner !== currentPhase.owner) {
      notifyRecipients({ userIds: [patch.ownerUserId || getUserIdFromName(patch.owner)], names: [patch.owner] }, {
        title: "Bạn được giao phụ trách giai đoạn",
        message: `${currentActorName} vừa giao bạn phụ trách giai đoạn ${nextPhase.title} của dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.receiver && patch.receiver !== currentPhase.receiver) {
      notifyRecipients({ userIds: [patch.receiverUserId || getUserIdFromName(patch.receiver)], names: [patch.receiver] }, {
        title: "Bạn là người tiếp nhận giai đoạn",
        message: `${currentActorName} vừa chọn bạn là người tiếp nhận giai đoạn ${nextPhase.title} của dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.handoffTo && patch.handoffTo !== currentPhase.handoffTo) {
      notifyRecipients({ userIds: [patch.handoffToUserId || getUserIdFromName(patch.handoffTo)], names: [patch.handoffTo] }, {
        title: "Có bàn giao mới chờ bạn",
        message: `${currentActorName} vừa cấu hình bàn giao giai đoạn ${nextPhase.title} sang bạn trong dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.participantUserIds) {
      notifyRoleAssignments(currentPhase.participantUserIds || [], patch.participantUserIds, {
        title: "Bạn được thêm vào giai đoạn",
        message: () => `${currentActorName} vừa thêm bạn vào nhóm tham gia giai đoạn ${nextPhase.title} của dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.supporterUserIds) {
      notifyRoleAssignments(currentPhase.supporterUserIds || [], patch.supporterUserIds, {
        title: "Bạn được thêm vào nhóm hỗ trợ",
        message: () => `${currentActorName} vừa thêm bạn vào nhóm hỗ trợ giai đoạn ${nextPhase.title} của dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
  }

  const updateTimelineItems = (phaseId: string, items: PhaseTimelineItem[]) => {
    const currentItems = phaseTimelines[phaseId] || []
    const currentMap = new Map(currentItems.map((item) => [item.id, item]))
    const phase = phases.find((row) => row.id === phaseId)

    setPhaseTimelines((current) => ({ ...current, [phaseId]: items }))

    if (!phase) return
    const link_url = buildWorkflowLink({ workflowId: selectedWorkflow.id, phaseId, timelineItemId: selectedTimelineItemId || items[0]?.id })

    items.forEach((item) => {
      const previous = currentMap.get(item.id)
      if (!previous) return

      if (item.owner !== previous.owner || item.ownerUserId !== previous.ownerUserId) {
        notifyRecipients({ userIds: [item.ownerUserId || getUserIdFromName(item.owner)], names: [item.owner] }, {
          title: "Bạn được giao mốc timeline",
          message: `${currentActorName} vừa giao bạn phụ trách mốc ${item.title} trong giai đoạn ${phase.title} của dự án ${selectedWorkflow.title}.`,
          link_url,
        })
      }
      if (item.status !== previous.status && item.status === "Hoàn thành") {
        notifyRecipients({ userIds: [phase.ownerUserId || "", phase.receiverUserId || "", phase.handoffToUserId || "", ...(item.supporterUserIds || [])], names: [phase.owner, phase.receiver, phase.handoffTo, ...item.supporters] }, {
          title: "Một mốc timeline đã hoàn thành",
          message: `${currentActorName} vừa cập nhật mốc ${item.title} sang hoàn thành trong giai đoạn ${phase.title} của dự án ${selectedWorkflow.title}.`,
          link_url,
        })
      }
      if (item.participantUserIds) {
        notifyRoleAssignments(previous.participantUserIds || [], item.participantUserIds, {
          title: "Bạn được thêm vào mốc timeline",
          message: () => `${currentActorName} vừa thêm bạn vào mốc ${item.title} của giai đoạn ${phase.title}.`,
          link_url,
        })
      }
      if (item.supporterUserIds) {
        notifyRoleAssignments(previous.supporterUserIds || [], item.supporterUserIds, {
          title: "Bạn được thêm vào nhóm hỗ trợ mốc timeline",
          message: () => `${currentActorName} vừa thêm bạn hỗ trợ mốc ${item.title} của giai đoạn ${phase.title}.`,
          link_url,
        })
      }
    })
  }

  const addPhase = () => {
    const phase: Phase = {
      id: `${selectedWorkflow.id}-phase-${Date.now()}`,
      workflowId: selectedWorkflow.id,
      title: "Giai đoạn mới",
      owner: "Chưa phân công",
      receiver: "Chưa chọn",
      handoffTo: "Chưa chọn",
      participants: [],
      supporters: [],
      start: 1,
      span: 2,
      progress: 0,
      status: "planned",
      acceptance: "Cấu hình điều kiện nghiệm thu.",
    }
    setPhasesByWorkflow((current) => ({ ...current, [selectedWorkflow.id]: [...(current[selectedWorkflow.id] || []), phase] }))
    setPhaseTimelines((current) => ({
      ...current,
      [phase.id]: [
        { id: `${phase.id}-tl-1`, title: "Lập kế hoạch chi tiết", owner: phase.owner, participants: [], supporters: [], startDate: "", endDate: "", status: "Chờ làm" },
      ],
    }))
    setSelectedPhaseId(phase.id)
    setSelectedTimelineItemId(`${phase.id}-tl-1`)
    setSelectedCardId("")
  }

  const addCard = () => {
    if (!selectedPhase || !newCardTitle.trim()) return
    const card: WorkCard = {
      id: `card-${Date.now()}`,
      workflowId: selectedWorkflow.id,
      phaseId: selectedPhase.id,
      title: newCardTitle.trim(),
      status: "todo",
      assignee: selectedPhase.owner,
      assigneeUserId: selectedPhase.ownerUserId,
      supervisors: [selectedPhase.receiver],
      supervisorUserIds: selectedPhase.receiverUserId ? [selectedPhase.receiverUserId] : [],
      approvers: [selectedPhase.handoffTo],
      approverUserIds: selectedPhase.handoffToUserId ? [selectedPhase.handoffToUserId] : [],
      participants: [],
      participantUserIds: [],
      due: "Chưa đặt hạn",
      priority: "Trung bình",
      checklist: [],
      formChecks: createDefaultFormChecks(),
      comments: [],
      createdBy: selectedWorkflow.initiator
    }
    setCards((current) => [card, ...current])
    setSelectedCardId(card.id)
    setNewCardTitle("")
    notifyRecipients({ userIds: [card.assigneeUserId || "", ...(card.supervisorUserIds || []), ...(card.approverUserIds || [])], names: [card.assignee, ...card.supervisors, ...card.approvers] }, {
      title: "Có công việc mới trong dự án",
      message: `${currentActorName} vừa tạo công việc ${card.title} trong giai đoạn ${selectedPhase.title} của dự án ${selectedWorkflow.title}.`,
      link_url: buildWorkflowLink({ workflowId: selectedWorkflow.id, phaseId: selectedPhase.id, cardId: card.id }),
    })
  }

  const updateCard = (cardId: string, patch: Partial<WorkCard>) => {
    const currentCard = cards.find((card) => card.id === cardId)
    if (!currentCard) return
    const newCard = { ...currentCard, ...patch }

    if (patch.checklist && patch.checklist.length > 0) {
      const total = patch.checklist.length
      const doneByExecutorCount = patch.checklist.filter((item) => item.doneByExecutor).length
      const approvedCount = patch.checklist.filter((item) => item.doneByExecutor && item.approvedBySupervisor).length

      if (approvedCount === total && newCard.status !== "done") {
        newCard.status = "done"
      } else if (doneByExecutorCount === total && approvedCount < total && newCard.status !== "review" && newCard.status !== "done") {
        newCard.status = "review"
      }
    }

    setCards((current) => current.map((card) => (card.id === cardId ? newCard : card)))

    const link_url = buildWorkflowLink({ workflowId: selectedWorkflow.id, phaseId: selectedPhase?.id, cardId })
    if (patch.assignee && patch.assignee !== currentCard.assignee) {
      notifyRecipients({ userIds: [patch.assigneeUserId || getUserIdFromName(patch.assignee)], names: [patch.assignee] }, {
        title: "Bạn được giao công việc",
        message: `${currentActorName} vừa bàn giao công việc ${newCard.title} cho bạn trong dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.status && patch.status !== currentCard.status) {
      notifyRecipients({ userIds: [newCard.assigneeUserId || "", ...(newCard.supervisorUserIds || []), ...(newCard.approverUserIds || [])], names: [newCard.assignee, ...newCard.supervisors, ...newCard.approvers] }, {
        title: "Công việc vừa đổi trạng thái",
        message: `${currentActorName} vừa cập nhật công việc ${newCard.title} sang trạng thái ${statusLabel(newCard.status)}.`,
        link_url,
      })
    }
    if (newCard.status !== currentCard.status && newCard.status === "done") {
      notifyRecipients({ userIds: [selectedPhase?.ownerUserId || "", selectedPhase?.receiverUserId || "", selectedPhase?.handoffToUserId || ""], names: [selectedPhase?.owner || "", selectedPhase?.receiver || "", selectedPhase?.handoffTo || ""] }, {
        title: "Một công việc đã hoàn thành",
        message: `${currentActorName} vừa hoàn thành công việc ${newCard.title} trong giai đoạn ${selectedPhase?.title || "đang chọn"} của dự án ${selectedWorkflow.title}.`,
        link_url,
      })
    }
    if (patch.supervisorUserIds) {
      notifyRoleAssignments(currentCard.supervisorUserIds || [], patch.supervisorUserIds, {
        title: "Bạn được thêm làm giám sát",
        message: () => `${currentActorName} vừa thêm bạn làm giám sát công việc ${newCard.title}.`,
        link_url,
      })
    }
    if (patch.participantUserIds) {
      notifyRoleAssignments(currentCard.participantUserIds || [], patch.participantUserIds, {
        title: "Bạn được thêm tham gia công việc",
        message: () => `${currentActorName} vừa thêm bạn tham gia công việc ${newCard.title}.`,
        link_url,
      })
    }
    if (patch.approverUserIds) {
      notifyRoleAssignments(currentCard.approverUserIds || [], patch.approverUserIds, {
        title: "Bạn được thêm phê duyệt công việc",
        message: () => `${currentActorName} vừa thêm bạn vào nhóm phê duyệt công việc ${newCard.title}.`,
        link_url,
      })
    }
  }


  const addChecklist = () => {
    if (!selectedCard || !newChecklist.trim()) return
    updateCard(selectedCard.id, {
      checklist: [...selectedCard.checklist, { text: newChecklist.trim(), doneByExecutor: false, approvedBySupervisor: false }],
    })
    setNewChecklist("")
  }

  const addComment = () => {
    if (!selectedCard || !newComment.trim()) return
    const commentText = newComment.trim()
    updateCard(selectedCard.id, {
      comments: [...selectedCard.comments, { author: currentActorName, text: commentText }],
    })
    setNewComment("")
    notifyRecipients({ userIds: [selectedCard.assigneeUserId || "", ...(selectedCard.supervisorUserIds || []), ...(selectedCard.participantUserIds || []), ...(selectedCard.approverUserIds || [])], names: [selectedCard.assignee, ...selectedCard.supervisors, ...selectedCard.participants, ...selectedCard.approvers] }, {
      title: "Có trao đổi mới trong công việc",
      message: `${currentActorName} vừa trao đổi ở công việc ${selectedCard.title}: ${commentText}`,
      link_url: buildWorkflowLink({ workflowId: selectedWorkflow.id, phaseId: selectedPhase?.id, cardId: selectedCard.id }),
    })
  }

  const scrollToSection = (sectionId: WorkspaceSection) => {
    setActiveSection(sectionId)
    window.setTimeout(() => {
      document.getElementById(`workspace-${sectionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 0)
  }

  const scrollToWorkspaceTop = () => {
    document.getElementById("project-workspace-top")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const phaseProgress = selectedPhase
    ? Math.round((phaseCards.filter((card) => card.status === "done").length / Math.max(phaseCards.length, 1)) * 100)
    : 0

  return (
    <DashboardLayout title="Dự án">
      <div id="project-workspace-top" className="space-y-4">
        <ProjectPickerBar
          query={query}
          onQueryChange={setQuery}
          workflows={filteredWorkflows}
          selectedWorkflow={selectedWorkflow}
          phasesByWorkflow={phasesByWorkflow}
          cards={cards}
          onSelectWorkflow={selectWorkflow}
        />

        <main className="min-w-0 space-y-4">
          <WorkflowHeader
            workflow={selectedWorkflow}
            phase={selectedPhase}
            phaseProgress={phaseProgress}
          />
          <WorkspaceAnchorNav activeSection={activeSection} onJump={scrollToSection} />

          <section id="workspace-gantt" className={clsx("scroll-mt-28 rounded-xl border border-slate-200 bg-white p-4 shadow-sm", activeSection !== "gantt" && "max-md:hidden")}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">Gantt giai đoạn và công việc liên kết</h2>
                <p className="mt-1 text-sm text-slate-500">Chọn một giai đoạn để xem đúng Kanban, người xử lý, người giám sát và checklist của giai đoạn đó.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
                <button
                  type="button"
                  onClick={() => setMobileGanttTimelineOpen((current) => !current)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 md:hidden"
                >
                  {mobileGanttTimelineOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {mobileGanttTimelineOpen ? "Ẩn timeline" : "Hiện timeline"}
                </button>
                <button type="button" onClick={addPhase} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#006b68] px-4 text-sm font-semibold text-white">
                  <Plus className="h-4 w-4" />
                  Thêm giai đoạn
                </button>
              </div>
            </div>
            <GanttBoardV2
              phases={phases}
              selectedPhaseId={selectedPhase?.id || ""}
              selectedTimelineItemId={selectedTimelineItemId}
              mobileTimelineOpen={mobileGanttTimelineOpen}
              cards={cards.filter((card) => card.workflowId === selectedWorkflow.id)}
              phaseTimelines={phaseTimelines}
              onSelectPhase={(phaseId) => {
                setSelectedPhaseId(phaseId)
                setSelectedTimelineItemId(phaseTimelines[phaseId]?.[0]?.id || "")
                setSelectedCardId(cards.find((card) => card.workflowId === selectedWorkflow.id && card.phaseId === phaseId)?.id || "")
              }}
              onSelectTimelineItem={(phaseId, timelineItemId) => {
                setSelectedPhaseId(phaseId)
                setSelectedTimelineItemId(timelineItemId)
                setSelectedCardId(cards.find((card) => card.workflowId === selectedWorkflow.id && card.phaseId === phaseId)?.id || "")
              }}
              onEditPhase={(phaseId) => {
                setSelectedPhaseId(phaseId)
                setEditingPhaseId(phaseId)
              }}
              onUpdatePhase={updatePhase}
            />
          </section>

          <section id="workspace-kanban" className={clsx("scroll-mt-28 rounded-xl border border-slate-200 bg-white shadow-sm", !["kanban", "task-detail", "task-forms", "task-discussion"].includes(activeSection) && "max-md:hidden")}>
            <SectionTitle title="Kanban của giai đoạn" description={selectedPhase ? `Công việc thuộc giai đoạn: ${selectedPhase.title}` : "Chưa chọn giai đoạn"} />
            <div className="p-4">
              {selectedPhase && (
                <KanbanPhase
                  phase={selectedPhase}
                  activeSection={activeSection}
                  cards={phaseCards}
                  selectedCard={selectedCard}
                  newCardTitle={newCardTitle}
                  newChecklist={newChecklist}
                  onNewCardTitleChange={setNewCardTitle}
                  onNewChecklistChange={setNewChecklist}
                  onAddCard={addCard}
                  onSelectCard={setSelectedCardId}
                  onUpdateCard={updateCard}
                  onAddChecklist={addChecklist}
                  newComment={newComment}
                  onNewCommentChange={setNewComment}
                  onAddComment={addComment}
                />
              )}
            </div>
          </section>

        </main>
        {editingPhaseId && (() => {
          const editingPhase = phases.find((phase) => phase.id === editingPhaseId)
          if (!editingPhase) return null
          const editingCards = cards.filter((card) => card.workflowId === selectedWorkflow.id && card.phaseId === editingPhase.id)
          return (
            <PhaseConfigDrawer
              phase={editingPhase}
              cards={editingCards}
              timeline={phaseTimelines[editingPhase.id] || []}
              selectedTimelineItemId={selectedTimelineItemId}
              onClose={() => setEditingPhaseId("")}
              onSelectTimelineItem={setSelectedTimelineItemId}
              onUpdateTimeline={(items) => updateTimelineItems(editingPhase.id, items)}
              onUpdate={(patch) => updatePhase(editingPhase.id, patch)}
            />
          )
        })()}
        <button
          type="button"
          onClick={scrollToWorkspaceTop}
          className="fixed bottom-5 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-[#006b68]/80 text-white shadow-lg shadow-emerald-950/20 backdrop-blur transition hover:bg-[#006b68] focus:outline-none focus:ring-2 focus:ring-white/70 md:hidden"
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>
    </DashboardLayout>
  )
}

function WorkspaceAnchorNav({
  activeSection,
  onJump,
}: {
  activeSection: WorkspaceSection
  onJump: (section: WorkspaceSection) => void
}) {
  const items: Array<{ key: WorkspaceSection; label: string; icon: any }> = [
    { key: "gantt", label: "Gantt", icon: CalendarDays },
    { key: "kanban", label: "Kanban của giai đoạn", icon: ClipboardList },
    { key: "task-detail", label: "Chi tiết công việc", icon: ClipboardList },
    { key: "task-forms", label: "Biểu mẫu", icon: ClipboardList },
    { key: "task-discussion", label: "Trao đổi công việc", icon: Search },
  ]

  return (
    <nav className="sticky top-0 z-30 -mx-2 border-b border-slate-200 bg-slate-50/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
      <div className="md:hidden">
        <label className="sr-only" htmlFor="workspace-mobile-nav">Chọn khu vực làm việc</label>
        <div className="relative">
          <select
            id="workspace-mobile-nav"
            value={activeSection}
            onChange={(event) => onJump(event.target.value as WorkspaceSection)}
            className="h-11 w-full appearance-none rounded-lg border border-emerald-300/40 bg-[#006b68] px-3 pr-10 text-sm font-bold text-white shadow-sm outline-none focus:border-white/70 focus:ring-2 focus:ring-[#006b68]/25"
          >
            {items.map(({ key, label }) => (
              <option key={key} value={key} className="bg-white text-slate-900">{label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
        </div>
      </div>
      <div className="hidden gap-1 overflow-x-auto md:flex">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onJump(key)}
            className={clsx(
              "inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-semibold transition",
              activeSection === key ? "bg-[#006b68] text-white shadow-sm" : "text-slate-600 hover:bg-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-b border-slate-100 p-4">
      <h2 className="text-lg font-bold tracking-tight text-[#006b68]">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function ProjectPickerBar({
  query,
  onQueryChange,
  workflows,
  selectedWorkflow,
  phasesByWorkflow,
  cards,
  onSelectWorkflow,
}: {
  query: string
  onQueryChange: (value: string) => void
  workflows: WorkflowInstance[]
  selectedWorkflow: WorkflowInstance
  phasesByWorkflow: Record<string, Phase[]>
  cards: WorkCard[]
  onSelectWorkflow: (workflowId: string) => void
}) {
  const selectedPhases = phasesByWorkflow[selectedWorkflow.id] || []
  const selectedCards = cards.filter((card) => card.workflowId === selectedWorkflow.id)
  const reviewCount = selectedCards.filter((card) => card.status === "review").length

  return (
    <section className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="grid gap-2 xl:grid-cols-[220px_1fr_auto] xl:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Tìm dự án, khách hàng..."
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
          />
        </div>

        <div className="min-w-0">
          <div className="flex gap-2 overflow-x-auto">
            {workflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => onSelectWorkflow(workflow.id)}
                className={clsx(
                  "min-w-[200px] rounded-lg border px-2.5 py-1.5 text-left transition",
                  workflow.id === selectedWorkflow.id
                    ? "border-[#006b68] bg-emerald-50 text-[#006b68]"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold">{workflow.title}</p>
                  <span className={clsx("shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold", statusTone(workflow.status))}>
                    {statusLabel(workflow.status)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{workflow.customer}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center xl:w-[210px]">
          <SmallCount label="Giai đoạn" value={selectedPhases.length} />
          <SmallCount label="Công việc" value={selectedCards.length} />
          <SmallCount label="Chờ duyệt" value={reviewCount} />
        </div>
      </div>
    </section>
  )
}

function WorkflowHeader({
  workflow,
  phase,
  phaseProgress,
  activeSection = "gantt",
  onJump = () => undefined,
}: {
  workflow: WorkflowInstance
  phase?: Phase
  phaseProgress: number
  activeSection?: WorkspaceSection
  onJump?: (section: WorkspaceSection) => void
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="grid gap-3 xl:grid-cols-[1fr_180px] xl:items-center">
        <div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{workflow.code}</span>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#006b68]">Dự án: {workflow.customer} - {workflow.title}</h1>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold text-slate-500">Tiến độ công việc</p>
          <p className="mt-0.5 text-sm font-bold text-[#006b68]">{phaseProgress}% hoàn thành</p>
        </div>
      </div>
      <div className="hidden">
      <div className="grid gap-3 xl:grid-cols-[1fr_180px] xl:items-center">
        <div>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{workflow.code}</span>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#006b68]">Dự án: {workflow.customer}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SmallFact label="Đơn vị phụ trách" value={workflow.ownerUnit} />
          <SmallFact label="Hạn tổng" value={workflow.due} />
          <SmallFact label="Giai đoạn đang xem" value={phase?.title || "Chưa chọn"} />
          <SmallFact label="Tiến độ giai đoạn" value={`${phaseProgress}% công việc xong`} />
        </div>
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3">
        <WorkspaceAnchorNav activeSection={activeSection} onJump={onJump} />
      </div>
      </div>
    </section>
  )
}

function GanttBoardV2({
  phases,
  selectedPhaseId,
  selectedTimelineItemId,
  mobileTimelineOpen,
  cards,
  phaseTimelines,
  onSelectPhase,
  onSelectTimelineItem,
  onEditPhase,
  onUpdatePhase,
}: {
  phases: Phase[]
  selectedPhaseId: string
  selectedTimelineItemId: string
  mobileTimelineOpen: boolean
  cards: WorkCard[]
  phaseTimelines: Record<string, PhaseTimelineItem[]>
  onSelectPhase: (phaseId: string) => void
  onSelectTimelineItem: (phaseId: string, timelineItemId: string) => void
  onEditPhase: (phaseId: string) => void
  onUpdatePhase: (phaseId: string, patch: Partial<Phase>) => void
}) {
  const ganttColumns = useMemo(() => {
    const datedItems = Object.values(phaseTimelines)
      .flat()
      .flatMap((item) => [parseLocalDate(item.startDate), parseLocalDate(item.endDate)])
      .filter((date): date is Date => Boolean(date))
    const baseDate = startOfWeek(datedItems.sort((a, b) => a.getTime() - b.getTime())[0] || new Date())

    return Array.from({ length: 16 }, (_, index) => {
      const startDate = addDays(baseDate, index * 7)
      const endDate = addDays(startDate, 6)
      return {
        week: index + 1,
        startDate,
        endDate,
        label: `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`,
      }
    })
  }, [phaseTimelines])
  const timelineStart = ganttColumns[0]?.startDate || startOfWeek(new Date())
  const timelineEnd = ganttColumns[ganttColumns.length - 1]?.endDate || addDays(timelineStart, 111)
  const timelineDays = Math.max(1, daysBetween(timelineStart, timelineEnd) + 1)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayOffset = today >= timelineStart && today <= timelineEnd
    ? (daysBetween(timelineStart, today) / timelineDays) * 100
    : null
  const gridTemplateColumns = "repeat(16, minmax(0, 1fr))"

  return (
    <div className="space-y-3">
      <div className={clsx("rounded-xl border border-slate-200 bg-white p-2 md:hidden", mobileTimelineOpen && "hidden")}>
        <div className="space-y-2">
          {phases.map((phase) => {
            const phaseCards = cards.filter((card) => card.phaseId === phase.id)
            const done = phaseCards.filter((card) => card.status === "done").length
            const timelineCount = phaseTimelines[phase.id]?.length || 0
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => onSelectPhase(phase.id)}
                className={clsx(
                  "w-full rounded-lg border p-3 text-left transition",
                  selectedPhaseId === phase.id ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 bg-white text-slate-800"
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-sm font-semibold">{phase.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{phase.owner} · {phase.progress}% · {timelineCount} mốc con</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditPhase(phase.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        event.stopPropagation()
                        onEditPhase(phase.id)
                      }
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                    aria-label={`Cấu hình ${phase.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>{statusLabel(phase.status)}</span>
                  <span>{done}/{phaseCards.length} công việc</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="hidden items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-3 py-2 text-xs text-slate-600 md:flex">
        <div className="flex flex-wrap items-center gap-3">
          {(["active", "planned", "risk", "done"] as PhaseStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5 font-semibold">
              <span className={clsx("h-2.5 w-8 rounded-full", ganttLegendTone(status))} />
              {statusLabel(status)}
            </span>
          ))}
        </div>
        <span className="text-right text-[11px] font-medium text-slate-500">
          Timeline dùng ngày bắt đầu/kết thúc của mốc con; mốc chưa có ngày sẽ được đặt tạm theo tuần của giai đoạn.
        </span>
      </div>

      <div className={clsx("overflow-x-auto rounded-xl border border-slate-200 bg-white", !mobileTimelineOpen && "max-md:hidden")}>
        <div className="min-w-[1500px]">
          <div className="sticky top-0 z-10 grid grid-cols-[280px_minmax(1120px,1fr)_96px] border-b border-slate-200 bg-white">
            <div className="border-r border-slate-200 p-3 text-xs font-semibold text-slate-500">Giai đoạn</div>
            <div className="relative grid" style={{ gridTemplateColumns }}>
              {ganttColumns.map((column) => (
                <div key={column.week} className="border-r border-slate-100 px-2 py-2 text-center leading-4">
                  <span className="block text-[11px] font-bold text-slate-700">{column.label}</span>
                  <span className="block text-[10px] font-medium text-slate-400">Tuần {column.week}</span>
                </div>
              ))}
              {todayOffset !== null && (
                <div className="pointer-events-none absolute bottom-0 top-0 w-px bg-rose-500" style={{ left: `${todayOffset}%` }}>
                  <span className="absolute -top-1 left-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-100">Hôm nay</span>
                </div>
              )}
            </div>
            <div className="p-3 text-right text-xs font-semibold text-slate-500">Kanban</div>
          </div>

          <div className="divide-y divide-slate-100">
            {phases.map((phase) => {
              const phaseCards = cards.filter((card) => card.phaseId === phase.id)
              const done = phaseCards.filter((card) => card.status === "done").length
              const timelineItems = phaseTimelines[phase.id] || []
              const visibleItems = timelineItems.length ? timelineItems : [{
                id: `${phase.id}-fallback`,
                title: phase.title,
                owner: phase.owner,
                participants: phase.participants || [],
                supporters: phase.supporters || [],
                startDate: "",
                endDate: "",
                status: statusLabel(phase.status),
              } as PhaseTimelineItem]
              const rowHeight = Math.max(96, 24 + visibleItems.length * 40)

              return (
                <div key={phase.id} className="grid grid-cols-[280px_minmax(1120px,1fr)_96px]">
                  <button
                    type="button"
                    onClick={() => onSelectPhase(phase.id)}
                    className={clsx(
                      "border-r border-slate-200 p-3 text-left transition",
                      selectedPhaseId === phase.id ? "bg-emerald-50 text-[#006b68]" : "bg-white hover:bg-slate-50"
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{phase.title}</span>
                        <span className="mt-1 block truncate text-xs text-slate-500">{phase.owner} · {phase.progress}% · {timelineItems.length} mốc con</span>
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation()
                          onEditPhase(phase.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            event.stopPropagation()
                            onEditPhase(phase.id)
                          }
                        }}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-[#006b68] hover:text-[#006b68]"
                        aria-label={`Cấu hình ${phase.title}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </span>
                    </span>
                    <span className="mt-3 block h-1.5 rounded-full bg-slate-100">
                      <span className={clsx("block h-full rounded-full", ganttBarTone(phase.status))} style={{ width: `${Math.max(0, Math.min(100, phase.progress))}%` }} />
                    </span>
                  </button>

                  <div className="relative bg-slate-50/50" style={{ minHeight: rowHeight }}>
                    <div className="absolute inset-0 grid" style={{ gridTemplateColumns }}>
                      {ganttColumns.map((column) => (
                        <button
                          key={column.week}
                          type="button"
                          onClick={() => {
                            onSelectPhase(phase.id)
                            onUpdatePhase(phase.id, { start: column.week })
                          }}
                          className="border-r border-slate-100 transition hover:bg-emerald-50/60"
                          aria-label={`Chọn ${phase.title} tuần ${formatShortDate(column.startDate)} đến ${formatShortDate(column.endDate)}`}
                        />
                      ))}
                    </div>
                    {todayOffset !== null && <div className="pointer-events-none absolute bottom-0 top-0 z-[1] w-px bg-rose-400" style={{ left: `${todayOffset}%` }} />}
                    {visibleItems.map((item, index) => {
                      const segmentDays = Math.max(4, Math.floor((Math.max(1, phase.span) * 7) / Math.max(visibleItems.length, 1)))
                      const fallbackStart = addDays(timelineStart, Math.max(0, phase.start - 1) * 7 + index * segmentDays)
                      const fallbackEnd = addDays(fallbackStart, segmentDays - 1)
                      const rawStart = parseLocalDate(item.startDate) || fallbackStart
                      const rawEnd = parseLocalDate(item.endDate) || fallbackEnd
                      const start = clampDate(rawStart <= rawEnd ? rawStart : rawEnd, timelineStart, timelineEnd)
                      const end = clampDate(rawEnd >= rawStart ? rawEnd : rawStart, timelineStart, timelineEnd)
                      const left = (daysBetween(timelineStart, start) / timelineDays) * 100
                      const width = Math.max(2.8, ((daysBetween(start, end) + 1) / timelineDays) * 100)
                      const selected = item.id === selectedTimelineItemId

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.id.endsWith("-fallback")) {
                              onSelectPhase(phase.id)
                              return
                            }
                            onSelectTimelineItem(phase.id, item.id)
                          }}
                          className={clsx(
                            "group absolute z-[2] h-8 rounded-md px-2 text-left text-[11px] font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:brightness-105",
                            selected ? "bg-slate-950 ring-2 ring-slate-300" : ganttBarTone(phase.status)
                          )}
                          style={{ left: `${left}%`, top: 12 + index * 40, width: `${width}%` }}
                        >
                          <span className="block truncate">{item.title}</span>
                          <span className="pointer-events-none absolute bottom-9 left-1/2 z-20 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-left text-xs font-normal text-slate-600 shadow-lg group-hover:block">
                            <span className="block font-semibold text-slate-950">{item.title}</span>
                            <span className="mt-1 block">Phụ trách: {item.owner}</span>
                            <span className="block">Thời gian: {timelineDateMeta(item)}</span>
                            <span className="block">Trạng thái: {item.status}</span>
                            <span className="block">Tham gia: {item.participants.length ? item.participants.join(", ") : "Chưa chọn"}</span>
                            <span className="block">Hỗ trợ: {item.supporters.length ? item.supporters.join(", ") : "Chưa chọn"}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPhase(phase.id)}
                    className="flex items-center justify-end border-l border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    {done}/{phaseCards.length}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function GanttBoard({
  phases,
  selectedPhaseId,
  selectedTimelineItemId,
  mobileTimelineOpen,
  cards,
  phaseTimelines,
  onSelectPhase,
  onSelectTimelineItem,
  onEditPhase,
  onUpdatePhase,
}: {
  phases: Phase[]
  selectedPhaseId: string
  selectedTimelineItemId: string
  mobileTimelineOpen: boolean
  cards: WorkCard[]
  phaseTimelines: Record<string, PhaseTimelineItem[]>
  onSelectPhase: (phaseId: string) => void
  onSelectTimelineItem: (phaseId: string, timelineItemId: string) => void
  onEditPhase: (phaseId: string) => void
  onUpdatePhase: (phaseId: string, patch: Partial<Phase>) => void
}) {
  const ganttColumns = useMemo(() => {
    const datedItems = Object.values(phaseTimelines)
      .flat()
      .flatMap((item) => [parseLocalDate(item.startDate), parseLocalDate(item.endDate)])
      .filter((date): date is Date => Boolean(date))
    const baseDate = startOfWeek(datedItems.sort((a, b) => a.getTime() - b.getTime())[0] || new Date())

    return Array.from({ length: 16 }, (_, index) => {
      const startDate = addDays(baseDate, index * 7)
      const endDate = addDays(startDate, 6)
      return {
        index,
        week: index + 1,
        startDate,
        endDate,
        label: `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`,
      }
    })
  }, [phaseTimelines])

  return (
    <div className="space-y-3">
      <div className={clsx("rounded-xl border border-slate-200 bg-white p-2 md:hidden", mobileTimelineOpen && "hidden")}>
        <div className="space-y-2">
          {phases.map((phase) => {
            const phaseCards = cards.filter((card) => card.phaseId === phase.id)
            const done = phaseCards.filter((card) => card.status === "done").length
            const timelineCount = phaseTimelines[phase.id]?.length || 0
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => onSelectPhase(phase.id)}
                className={clsx(
                  "w-full rounded-lg border p-3 text-left transition",
                  selectedPhaseId === phase.id ? "border-[#006b68] bg-emerald-50 text-[#006b68]" : "border-slate-200 bg-white text-slate-800"
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <span className="block text-sm font-semibold">{phase.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{phase.owner} · {phase.progress}% · {timelineCount} mốc con</span>
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditPhase(phase.id)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        event.stopPropagation()
                        onEditPhase(phase.id)
                      }
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                    aria-label={`Cấu hình ${phase.title}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>{statusLabel(phase.status)}</span>
                  <span>{done}/{phaseCards.length} công việc</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="hidden items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 px-3 py-2 text-xs text-slate-600 md:flex">
        <div className="flex flex-wrap items-center gap-3">
          {(["active", "planned", "risk", "done"] as PhaseStatus[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5 font-semibold">
              <span className={clsx("h-2.5 w-8 rounded-full", ganttLegendTone(status))} />
              {statusLabel(status)}
            </span>
          ))}
        </div>
        <span className="text-right text-[11px] font-medium text-slate-500">
          Thanh ưu tiên ngày bắt đầu/kết thúc của timeline con; nếu chưa đặt ngày sẽ tạm dùng tuần tương đối.
        </span>
      </div>
      <div className={clsx("overflow-x-auto rounded-xl border border-slate-200 bg-white", !mobileTimelineOpen && "max-md:hidden")}>
      <div className="min-w-[1940px] p-3">
        <div className="grid grid-cols-[260px_repeat(16,96px)_90px] border-b border-slate-200 pb-2 text-xs font-semibold text-slate-500">
          <div>Giai đoạn</div>
          {ganttColumns.map((column) => (
            <div key={column.week} className="text-center leading-4">
              <span className="block text-[11px] font-bold text-slate-700">{column.label}</span>
              <span className="block text-[10px] font-medium text-slate-400">Tuần {column.week}</span>
            </div>
          ))}
          <div className="text-right">Kanban</div>
        </div>
        <div className="divide-y divide-slate-100">
          {phases.map((phase) => {
            const phaseCards = cards.filter((card) => card.phaseId === phase.id)
            const done = phaseCards.filter((card) => card.status === "done").length
            const timelineCount = phaseTimelines[phase.id]?.length || 0
            const timelineItems = phaseTimelines[phase.id] || []
            const hasDatedTimeline = timelineItems.some((item) => parseLocalDate(item.startDate) || parseLocalDate(item.endDate))
            return (
              <div key={phase.id} className="grid grid-cols-[260px_repeat(16,96px)_90px] items-start py-3">
                <button
                  type="button"
                  onClick={() => onSelectPhase(phase.id)}
                  className={clsx(
                    "mr-3 rounded-lg p-3 text-left transition",
                    selectedPhaseId === phase.id ? "bg-emerald-50 text-[#006b68] ring-1 ring-[#006b68]/20" : "hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold">{phase.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation()
                        onEditPhase(phase.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          event.stopPropagation()
                          onEditPhase(phase.id)
                        }
                      }}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-[#006b68] hover:text-[#006b68]"
                      aria-label={`Cấu hình ${phase.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <p className="mt-1 text-xs text-slate-500">{phase.owner} · {phase.progress}% · {timelineCount} mốc con</p>
                </button>
                {ganttColumns.map((column) => {
                  const week = column.week
                  const datedChildItem = timelineItems.find((item) => {
                    const itemStart = parseLocalDate(item.startDate)
                    const itemEnd = parseLocalDate(item.endDate)
                    if (!itemStart && !itemEnd) return false
                    return overlapsDateRange(itemStart || itemEnd!, itemEnd || itemStart!, column.startDate, column.endDate)
                  })
                  const previousDatedChildItem = timelineItems.find((item) => {
                    const itemStart = parseLocalDate(item.startDate)
                    const itemEnd = parseLocalDate(item.endDate)
                    if (!itemStart && !itemEnd) return false
                    return overlapsDateRange(itemStart || itemEnd!, itemEnd || itemStart!, addDays(column.startDate, -7), addDays(column.endDate, -7))
                  })
                  const fallbackActive = week >= phase.start && week < phase.start + phase.span
                  const active = hasDatedTimeline ? Boolean(datedChildItem) : fallbackActive
                  const timelineIndex = fallbackActive && phase.span > 0
                    ? Math.floor(((week - phase.start) / Math.max(phase.span, 1)) * Math.max(timelineItems.length, 1))
                    : -1
                  const previousTimelineIndex = fallbackActive && week > phase.start && phase.span > 0
                    ? Math.floor(((week - phase.start - 1) / Math.max(phase.span, 1)) * Math.max(timelineItems.length, 1))
                    : -1
                  const fallbackChildItem = timelineIndex !== previousTimelineIndex ? timelineItems[timelineIndex] : undefined
                  const activeChildItem = datedChildItem || (hasDatedTimeline ? undefined : fallbackChildItem)
                  const childItem = datedChildItem && datedChildItem.id === previousDatedChildItem?.id ? undefined : activeChildItem
                  return (
                    <button
                      key={week}
                      type="button"
                      onClick={() => {
                        if (activeChildItem) {
                          onSelectTimelineItem(phase.id, activeChildItem.id)
                          return
                        }
                        onSelectPhase(phase.id)
                        if (!active) onUpdatePhase(phase.id, { start: week })
                      }}
                      className="group relative h-14 border-l border-slate-100"
                      aria-label={`Chọn ${phase.title} tuần ${formatShortDate(column.startDate)} đến ${formatShortDate(column.endDate)}`}
                    >
                      {active && (
                        <span
                          className={clsx(
                            "absolute left-0 right-0 top-1 h-6 rounded-sm transition-all group-hover:-translate-y-0.5 group-hover:brightness-105",
                            ganttBarTone(phase.status)
                          )}
                        />
                      )}
                      {childItem && (
                        <>
                          <span className={clsx(
                            "absolute bottom-1 left-1 right-1 truncate rounded bg-white px-1 py-0.5 text-[10px] font-semibold ring-1",
                            childItem.id === selectedTimelineItemId ? "text-white bg-[#006b68] ring-[#006b68]" : "text-[#006b68] ring-emerald-100"
                          )}>
                            {childItem.title}
                          </span>
                          <span className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-600 shadow-lg group-hover:block">
                            <span className="block font-semibold text-slate-950">{childItem.title}</span>
                            <span className="mt-1 block">Phụ trách: {childItem.owner}</span>
                            <span className="block">Thời gian: {timelineDateMeta(childItem)}</span>
                            <span className="block">Trạng thái: {childItem.status}</span>
                            <span className="block">Tham gia: {childItem.participants.length ? childItem.participants.join(", ") : "Chưa chọn"}</span>
                            <span className="block">Hỗ trợ: {childItem.supporters.length ? childItem.supporters.join(", ") : "Chưa chọn"}</span>
                          </span>
                        </>
                      )}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => onSelectPhase(phase.id)}
                  className="justify-self-end rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"
                >
                  {done}/{phaseCards.length}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </div>
  )
}


function PhaseConfig({
  phase,
  cards,
  timeline,
  selectedTimelineItemId,
  onSelectTimelineItem,
  onUpdate,
  onUpdateTimeline,
}: {
  phase: Phase
  cards: WorkCard[]
  timeline: PhaseTimelineItem[]
  selectedTimelineItemId: string
  onSelectTimelineItem: (timelineItemId: string) => void
  onUpdate: (patch: Partial<Phase>) => void
  onUpdateTimeline: (items: PhaseTimelineItem[]) => void
}) {
  const done = cards.filter((card) => card.status === "done").length
  const [openDetails, setOpenDetails] = useState(false)
  const [openHandoff, setOpenHandoff] = useState(false)
  const [openTimeline, setOpenTimeline] = useState(Boolean(selectedTimelineItemId))

  useEffect(() => {
    if (selectedTimelineItemId) setOpenTimeline(true)
  }, [selectedTimelineItemId])

  const addTimelineItem = () => {
    const nextId = `${phase.id}-tl-${Date.now()}`
    onUpdateTimeline([
      ...timeline,
      {
        id: nextId,
        title: "Mốc timeline mới",
        owner: phase.owner,
        ownerUserId: phase.ownerUserId,
        participants: [...(phase.participants || [])],
        participantUserIds: [...(phase.participantUserIds || [])],
        supporters: [...(phase.supporters || [])],
        supporterUserIds: [...(phase.supporterUserIds || [])],
        startDate: "",
        endDate: "",
        status: "Chờ làm",
      },
    ])
    onSelectTimelineItem(nextId)
    setOpenTimeline(true)
  }

  return (
    <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">Cấu hình giai đoạn</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{phase.title}</h3>
          <p className="mt-1 text-xs text-slate-500">{done}/{cards.length} công việc hoàn thành · {timeline.length} mốc timeline con</p>
        </div>
        <span className={clsx("rounded-md border px-2 py-1 text-xs font-semibold", statusTone(phase.status))}>{statusLabel(phase.status)}</span>
      </div>

      <div className="mt-3 space-y-2">
        <AccordionBar title="Thông tin giai đoạn" meta={`Tuần ${phase.start} · ${phase.span} tuần · ${phase.progress}%`} open={openDetails} onToggle={() => setOpenDetails((current) => !current)}>
          <div className="grid gap-2 md:grid-cols-4">
            <NumberField label="Tuần bắt đầu" value={phase.start} min={1} max={16} onChange={(value) => onUpdate({ start: value })} />
            <NumberField label="Độ dài" value={phase.span} min={1} max={16} onChange={(value) => onUpdate({ span: value })} />
            <NumberField label="Tiến độ" value={phase.progress} min={0} max={100} onChange={(value) => onUpdate({ progress: value })} />
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">Trạng thái</span>
              <select
                value={phase.status}
                onChange={(event) => onUpdate({ status: event.target.value as PhaseStatus })}
                className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
              >
                <option value="planned">Dự kiến</option>
                <option value="active">Đang làm</option>
                <option value="risk">Có vấn đề</option>
                <option value="done">Hoàn thành</option>
              </select>
            </label>
          </div>
          <div className="mt-2">
            <TextField label="Tên giai đoạn" value={phase.title} onChange={(value) => onUpdate({ title: value })} />
          </div>
        </AccordionBar>

        <AccordionBar title="Bàn giao và nghiệm thu" meta={`${phase.owner} → ${phase.handoffTo}`} open={openHandoff} onToggle={() => setOpenHandoff((current) => !current)}>
          <div className="grid gap-2 md:grid-cols-3">
            <UserSelectField label="Người phụ trách" value={phase.owner} onChange={(value) => onUpdate({ owner: value, ownerUserId: getUserIdFromName(value) })} />
            <UserSelectField label="Người tiếp nhận" value={phase.receiver} onChange={(value) => onUpdate({ receiver: value, receiverUserId: getUserIdFromName(value) })} />
            <UserSelectField label="Bàn giao tới" value={phase.handoffTo} onChange={(value) => onUpdate({ handoffTo: value, handoffToUserId: getUserIdFromName(value) })} />
          </div>
          <RoleMultiPicker label="Người tham gia đi giai đoạn" values={phase.participants || []} tone="emerald" onChange={(values) => onUpdate({ participants: values, participantUserIds: values.map(getUserIdFromName).filter(Boolean) })} />
          <RoleMultiPicker label="Người hỗ trợ giai đoạn" values={phase.supporters || []} tone="sky" onChange={(values) => onUpdate({ supporters: values, supporterUserIds: values.map(getUserIdFromName).filter(Boolean) })} />
          <label className="mt-2 block">
            <span className="text-xs font-semibold text-slate-500">Điều kiện nghiệm thu</span>
            <textarea
              value={phase.acceptance}
              onChange={(event) => onUpdate({ acceptance: event.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
            />
          </label>
        </AccordionBar>

        <AccordionBar title="Timeline con" meta={selectedTimelineItemId ? "Đang mở mốc được chọn trên Gantt" : `${timeline.length} mốc`} open={openTimeline} onToggle={() => setOpenTimeline((current) => !current)}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Mỗi mốc con có người phụ trách, người tham gia, người hỗ trợ và khoảng ngày bắt đầu - kết thúc.</p>
            <button type="button" onClick={addTimelineItem} className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white">
              + Mốc
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {timeline.map((item) => {
              const active = item.id === selectedTimelineItemId
              return (
                <div key={item.id} className={clsx("rounded-md border bg-slate-50 p-2", active ? "border-[#006b68] ring-2 ring-[#006b68]/10" : "border-slate-200")}>
                  <button type="button" onClick={() => onSelectTimelineItem(item.id)} className="flex w-full items-center justify-between gap-2 text-left">
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">{item.title}</span>
                      <span className="mt-0.5 block text-[11px] text-slate-500">{timelineDateMeta(item)}</span>
                    </span>
                    <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">{item.status}</span>
                  </button>
                  {active && (
                    <div className="mt-2 space-y-2">
                      <input
                        value={item.title}
                        onChange={(event) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, title: event.target.value } : row))}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none focus:border-[#006b68]"
                      />
                      <div className="grid gap-2 md:grid-cols-3">
                        <UserSelectField label="Người phụ trách" value={item.owner} onChange={(value) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, owner: value, ownerUserId: getUserIdFromName(value) } : row))} />
                        <DateField label="Từ ngày" value={item.startDate} onChange={(value) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, startDate: value } : row))} />
                        <DateField label="Đến ngày" value={item.endDate} onChange={(value) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, endDate: value } : row))} />
                      </div>
                      <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                        Đơn vị thời gian: {durationInDays(item.startDate, item.endDate) ? `${durationInDays(item.startDate, item.endDate)} ngày` : "Chọn từ ngày - đến ngày để hệ thống tính"}
                      </div>
                      <select
                        value={item.status}
                        onChange={(event) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, status: event.target.value as PhaseTimelineItem["status"] } : row))}
                        className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#006b68]"
                      >
                        <option value="Chờ làm">Chờ làm</option>
                        <option value="Đang làm">Đang làm</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                      </select>
                      <RoleMultiPicker label="Người tham gia mốc con" values={item.participants || []} tone="emerald" onChange={(values) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, participants: values, participantUserIds: values.map(getUserIdFromName).filter(Boolean) } : row))} />
                      <RoleMultiPicker label="Người hỗ trợ mốc con" values={item.supporters || []} tone="sky" onChange={(values) => onUpdateTimeline(timeline.map((row) => row.id === item.id ? { ...row, supporters: values, supporterUserIds: values.map(getUserIdFromName).filter(Boolean) } : row))} />
                    </div>
                  )}
                </div>
              )
            })}
            {timeline.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                Chưa có timeline con cho giai đoạn này.
              </div>
            )}
          </div>
        </AccordionBar>
      </div>
    </aside>
  )
}


function PhaseConfigDrawer({
  phase,
  cards,
  timeline,
  selectedTimelineItemId,
  onClose,
  onSelectTimelineItem,
  onUpdate,
  onUpdateTimeline,
}: {
  phase: Phase
  cards: WorkCard[]
  timeline: PhaseTimelineItem[]
  selectedTimelineItemId: string
  onClose: () => void
  onSelectTimelineItem: (timelineItemId: string) => void
  onUpdate: (patch: Partial<Phase>) => void
  onUpdateTimeline: (items: PhaseTimelineItem[]) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/20">
      <button type="button" aria-label="Đóng cấu hình" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-slate-50 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cấu hình giai đoạn</p>
            <h2 className="mt-1 text-lg font-bold text-[#006b68]">{phase.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Đóng
          </button>
        </div>
        <PhaseConfig
          phase={phase}
          cards={cards}
          timeline={timeline}
          selectedTimelineItemId={selectedTimelineItemId}
          onSelectTimelineItem={onSelectTimelineItem}
          onUpdate={onUpdate}
          onUpdateTimeline={onUpdateTimeline}
        />
      </aside>
    </div>
  )
}

function AccordionBar({ title, meta, open, onToggle, children }: { title: string; meta: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{meta}</p>
        </div>
        <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">{open ? "Ẩn" : "Hiện"}</span>
      </button>
      {open && <div className="border-t border-slate-100 p-3">{children}</div>}
    </section>
  )
}

function KanbanPhase({
  phase,
  activeSection,
  cards,
  selectedCard,
  newCardTitle,
  newChecklist,
  newComment,
  onNewCardTitleChange,
  onNewChecklistChange,
  onNewCommentChange,
  onAddCard,
  onSelectCard,
  onUpdateCard,
  onAddChecklist,
  onAddComment,
}: {
  phase: Phase
  activeSection: WorkspaceSection
  cards: WorkCard[]
  selectedCard?: WorkCard
  newCardTitle: string
  newChecklist: string
  newComment: string
  onNewCardTitleChange: (value: string) => void
  onNewChecklistChange: (value: string) => void
  onNewCommentChange: (value: string) => void
  onAddCard: () => void
  onSelectCard: (cardId: string) => void
  onUpdateCard: (cardId: string, patch: Partial<WorkCard>) => void
  onAddChecklist: () => void
  onAddComment: () => void
}) {
  return (
    <div className="space-y-4">
      <div className={clsx("space-y-3", activeSection !== "kanban" && "max-md:hidden")}>
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 md:flex-row">
          <input
            value={newCardTitle}
            onChange={(event) => onNewCardTitleChange(event.target.value)}
            placeholder={`Thêm công việc cho giai đoạn "${phase.title}"...`}
            className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
          />
          <button type="button" onClick={onAddCard} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#006b68] px-4 text-sm font-semibold text-white">
            <Plus className="h-4 w-4" />
            Thêm công việc
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {cardColumns.map((column) => {
            const rows = cards.filter((card) => card.status === column.key)
            return (
              <section key={column.key} className="min-h-[320px] rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-950">{column.title}</h3>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{rows.length}</span>
                </div>
                <div className="space-y-2">
                  {rows.map((card) => {
                    const done = card.checklist.filter((item) => item.doneByExecutor && item.approvedBySupervisor).length
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => onSelectCard(card.id)}
                        className={clsx(
                          "w-full rounded-lg border bg-white p-3 text-left shadow-sm transition",
                          selectedCard?.id === card.id ? "border-[#006b68] ring-2 ring-[#006b68]/10" : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-5 text-slate-950">{card.title}</p>
                          <PriorityDot priority={card.priority} />
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <p>Người làm: <span className="font-semibold text-slate-700">{card.assignee}</span> · hạn {card.due}</p>
                          <p className="line-clamp-1">Người tạo: {card.createdBy || "Chưa ghi nhận"}</p>
                          <p className="line-clamp-1">Giám sát: {card.supervisors.join(", ") || "Chưa có"}</p>
                          <p className="line-clamp-1">Tham gia: {card.participants.join(", ") || "Chưa có"} · Duyệt: {card.approvers.join(", ") || "Chưa có"}</p>
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                            <span>Checklist</span>
                            <span>{done}/{card.checklist.length}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-[#006b68]" style={{ width: `${Math.round((done / Math.max(card.checklist.length, 1)) * 100)}%` }} />
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                          <span>{statusLabel(card.status)}</span>
                          <span>{card.comments.length} comment</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <div className={clsx("grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]", activeSection === "kanban" && "max-md:hidden")}>
        <div id="workspace-task-detail" className={clsx("scroll-mt-32", !["task-detail", "task-forms"].includes(activeSection) && "max-md:hidden")}>
          <CardDetail
            card={selectedCard}
            activeSection={activeSection}
            newChecklist={newChecklist}
            onNewChecklistChange={onNewChecklistChange}
            onUpdateCard={onUpdateCard}
            onAddChecklist={onAddChecklist}
          />
        </div>
        <div id="workspace-task-discussion" className={clsx("scroll-mt-32", activeSection !== "task-discussion" && "max-md:hidden")}>
          <CardDiscussion
            cards={cards}
            selectedCard={selectedCard}
            newComment={newComment}
            onSelectCard={onSelectCard}
            onNewCommentChange={onNewCommentChange}
            onAddComment={onAddComment}
          />
        </div>
      </div>
    </div>
  )
}

function RoleMultiPicker({
  label,
  values,
  tone,
  onChange,
}: {
  label: string
  values: string[]
  tone: "sky" | "emerald" | "amber"
  onChange: (values: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const normalized = query.trim().toLowerCase()
  const options = workspaceUserOptions.filter((user) => !values.includes(user) && (!normalized || user.toLowerCase().includes(normalized))).slice(0, 6)
  const toneClass = {
    sky: "border-sky-100 bg-sky-50 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50 text-[#006b68]",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  }[tone]

  const addValue = (name: string) => {
    const cleaned = name.trim()
    if (!cleaned || values.includes(cleaned) || !workspaceUserOptions.includes(cleaned)) return
    onChange([...values, cleaned])
    setQuery("")
  }

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {values.slice(0, 4).map((name) => {
              const isRealUser = Boolean(getUserIdFromName(name))
              return (
              <span key={name} className={clsx("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold", isRealUser ? toneClass : "border-rose-100 bg-rose-50 text-rose-600")}>
                {name}
                {!isRealUser && <span className="text-[10px] font-semibold">(cũ)</span>}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation()
                    onChange(values.filter((item) => item !== name))
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      event.stopPropagation()
                      onChange(values.filter((item) => item !== name))
                    }
                  }}
                  className="ml-1 rounded text-current opacity-60 hover:opacity-100"
                  aria-label={`Bỏ ${name}`}
                >
                  ×
                </span>
              </span>
            )})}
            {values.length > 4 && <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">+{values.length - 4}</span>}
            {values.length === 0 && <span className="text-xs text-rose-500">Chưa chọn</span>}
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">{open ? "Thu gọn" : `${values.length} người`}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addValue(options[0] || "")
            }}
            placeholder={`Tìm hoặc nhập ${label.toLowerCase()}...`}
            className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs outline-none focus:border-[#006b68] focus:bg-white focus:ring-2 focus:ring-[#006b68]/15"
          />
        </label>
        <button
          type="button"
          disabled={options.length === 0}
          onClick={() => addValue(options[0] || "")}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </button>
      </div>
      {options.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {options.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addValue(name)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-[#006b68] hover:bg-emerald-50 hover:text-[#006b68]"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
      {workspaceUserOptions.length === 0 && (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">Chưa tải được danh sách user active từ Supabase.</p>
      )}
        </>
      )}
    </div>
  )
}

function CardDiscussion({
  cards,
  selectedCard,
  newComment,
  onSelectCard,
  onNewCommentChange,
  onAddComment,
}: {
  cards: WorkCard[]
  selectedCard?: WorkCard
  newComment: string
  onSelectCard: (cardId: string) => void
  onNewCommentChange: (value: string) => void
  onAddComment: () => void
}) {
  if (!selectedCard) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
        Chọn một công việc Kanban để xem trao đổi.
      </aside>
    )
  }

  return (
    <aside className="flex min-h-[520px] flex-col rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#006b68]">Trao đổi công việc</p>
          <h3 className="mt-1 text-base font-bold text-[#006b68]">{selectedCard.title}</h3>
        </div>
        <span className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{selectedCard.comments.length} comment</span>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[220px_1fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Task trong giai đoạn</p>
          <div className="max-h-[360px] space-y-1 overflow-y-auto pr-1">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectCard(card.id)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-xs font-semibold transition",
                  selectedCard.id === card.id ? "bg-white text-[#006b68] ring-1 ring-emerald-100" : "text-slate-600 hover:bg-white"
                )}
              >
                <span className="line-clamp-2">{card.title}</span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">{card.comments.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-[430px] flex-col">
          <div className="max-h-[360px] flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {selectedCard.comments.map((comment, index) => (
              <div key={`${comment.author}-${index}`} className="flex gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-100">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-[#006b68]">
                  {comment.author.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{comment.author}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{comment.text}</p>
                </div>
              </div>
            ))}
            {selectedCard.comments.length === 0 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
                Chưa có trao đổi nào cho task này.
              </div>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={newComment}
              onChange={(event) => onNewCommentChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onAddComment()
              }}
              placeholder="Nhập trao đổi, vướng mắc hoặc kết quả xử lý..."
              className="h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
            />
            <button type="button" onClick={onAddComment} className="rounded-lg bg-[#006b68] px-5 text-sm font-semibold text-white">
              Gửi
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}

function CardChecklist({
  card,
  newChecklist,
  onNewChecklistChange,
  onUpdateCard,
  onAddChecklist,
}: {
  card: WorkCard
  newChecklist: string
  onNewChecklistChange: (value: string) => void
  onUpdateCard: (cardId: string, patch: Partial<WorkCard>) => void
  onAddChecklist: () => void
}) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">Checklist (Yêu cầu 2 bước xác nhận)</p>
      <div className="mt-2 space-y-2">
        {card.checklist.map((item, index) => (
          <div key={`${item.text}-${index}`} className="flex flex-col gap-2 rounded-md bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
            <span className={clsx(
              "leading-relaxed font-medium transition",
              item.doneByExecutor && item.approvedBySupervisor ? "line-through text-slate-400" : "text-slate-800"
            )}>
              {item.text}
            </span>
            <div className="flex items-center gap-4 border-t border-slate-100 pt-2 mt-1">
              <label className="flex items-center gap-1.5 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.doneByExecutor}
                  onChange={() => {
                    const updated = card.checklist.map((check, checkIndex) =>
                      checkIndex === index ? { ...check, doneByExecutor: !check.doneByExecutor, approvedBySupervisor: !check.doneByExecutor ? check.approvedBySupervisor : false } : check
                    )
                    onUpdateCard(card.id, { checklist: updated })
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-[#006b68] focus:ring-[#006b68]/20"
                />
                <span className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">Làm xong</span>
              </label>

              <label className="flex items-center gap-1.5 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.approvedBySupervisor}
                  disabled={!item.doneByExecutor}
                  onChange={() => {
                    const updated = card.checklist.map((check, checkIndex) =>
                      checkIndex === index ? { ...check, approvedBySupervisor: !check.approvedBySupervisor } : check
                    )
                    onUpdateCard(card.id, { checklist: updated })
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <span className={clsx("text-[11px] font-semibold", item.doneByExecutor ? "text-slate-500 hover:text-slate-700" : "text-slate-300 cursor-not-allowed")}>Đã duyệt</span>
              </label>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={newChecklist}
          onChange={(event) => onNewChecklistChange(event.target.value)}
          placeholder="Thêm checklist..."
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
        />
        <button type="button" onClick={onAddChecklist} className="rounded-md bg-slate-900 px-3 text-sm font-semibold text-white">Thêm</button>
      </div>
    </div>
  )
}

function CardFormChecks({ card, onUpdateCard }: { card: WorkCard; onUpdateCard: (cardId: string, patch: Partial<WorkCard>) => void }) {
  const rows = card.formChecks || []
  const done = rows.filter((row) => row.checked).length

  return (
    <div id="workspace-task-forms" className="mt-4 scroll-mt-32 rounded-lg border border-slate-200 bg-emerald-50/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#006b68]">Biểu mẫu / hồ sơ / sticknote kiểm tra</p>
          <p className="mt-1 text-[11px] text-slate-500">Dùng để kiểm tra task đã có đủ biểu mẫu và hồ sơ trước khi chuyển bước.</p>
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{done}/{rows.length}</span>
      </div>

      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white p-3 text-sm text-slate-400">
            Chưa cấu hình biểu mẫu cho công việc này.
          </div>
        ) : rows.map((row, index) => (
          <label key={`${row.type}-${row.text}-${index}`} className="flex cursor-pointer items-start gap-2 rounded-md bg-white p-3 text-sm ring-1 ring-slate-200">
            <input
              type="checkbox"
              checked={row.checked}
              onChange={() => {
                const nextRows = rows.map((item, itemIndex) => itemIndex === index ? { ...item, checked: !item.checked } : item)
                onUpdateCard(card.id, { formChecks: nextRows })
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#006b68] focus:ring-[#006b68]/20"
            />
            <span className="min-w-0 flex-1">
              <span className={clsx("block font-semibold", row.checked ? "text-slate-400 line-through" : "text-slate-800")}>{row.text}</span>
              <span className="mt-1 inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-[#006b68]">{row.type}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function CardDetail({
  card,
  activeSection,
  newChecklist,
  onNewChecklistChange,
  onUpdateCard,
  onAddChecklist,
}: {
  card?: WorkCard
  activeSection: WorkspaceSection
  newChecklist: string
  onNewChecklistChange: (value: string) => void
  onUpdateCard: (cardId: string, patch: Partial<WorkCard>) => void
  onAddChecklist: () => void
}) {
  if (!card) {
    return <aside className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">Giai đoạn này chưa có công việc.</aside>
  }
  const done = card.checklist.filter((item) => item.doneByExecutor && item.approvedBySupervisor).length
  const canMoveNext = Boolean(card.assignee && card.supervisors.length > 0 && card.participants.length > 0 && card.approvers.length > 0)
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-4">
      <div className={clsx(activeSection === "task-forms" && "max-md:hidden")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-[#006b68]">Chi tiết công việc</p>
          <input
            value={card.title}
            onChange={(event) => onUpdateCard(card.id, { title: event.target.value })}
            className="mt-1 w-full rounded-md border border-transparent bg-transparent text-base font-bold text-[#006b68] outline-none focus:border-slate-200 focus:bg-white focus:px-2"
          />
          {card.createdBy && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Người tạo: <span className="font-semibold">{card.createdBy}</span>
            </p>
          )}
        </div>
        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{done}/{card.checklist.length}</span>
      </div>

      <CardChecklist
        card={card}
        newChecklist={newChecklist}
        onNewChecklistChange={onNewChecklistChange}
        onUpdateCard={onUpdateCard}
        onAddChecklist={onAddChecklist}
      />
      </div>

      <div className={clsx(activeSection !== "task-forms" && "max-md:hidden")}>
        <CardFormChecks card={card} onUpdateCard={onUpdateCard} />
      </div>

      <div className={clsx(activeSection === "task-forms" && "max-md:hidden")}>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Người làm</span>
          <select
            value={card.assignee}
            onChange={(event) => onUpdateCard(card.id, { assignee: event.target.value, assigneeUserId: getUserIdFromName(event.target.value) })}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
          >
            {workspaceUserOptions.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
            {!workspaceUserOptions.includes(card.assignee) && (
              <option value={card.assignee} disabled>{card.assignee} (giá trị cũ - chọn user thật)</option>
            )}
          </select>
        </label>
        <TextField label="Hạn" value={card.due} onChange={(value) => onUpdateCard(card.id, { due: value })} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Trạng thái</span>
          <select
            value={card.status}
            onChange={(event) => onUpdateCard(card.id, { status: event.target.value as CardStatus })}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
          >
            <option value="todo">Chờ nhận</option>
            <option value="doing">Đang làm</option>
            <option value="review">Chờ duyệt</option>
            <option value="done">Hoàn thành</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">Ưu tiên</span>
          <select
            value={card.priority}
            onChange={(event) => onUpdateCard(card.id, { priority: event.target.value as WorkCard["priority"] })}
            className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
          >
            <option value="Thấp">Thấp</option>
            <option value="Trung bình">Trung bình</option>
            <option value="Cao">Cao</option>
          </select>
        </label>
      </div>

      <RoleMultiPicker
        label="Người giám sát"
        values={card.supervisors}
        tone="sky"
        onChange={(values) => onUpdateCard(card.id, { supervisors: values, supervisorUserIds: values.map(getUserIdFromName).filter(Boolean) })}
      />
      <RoleMultiPicker
        label="Người tham gia"
        values={card.participants}
        tone="emerald"
        onChange={(values) => onUpdateCard(card.id, { participants: values, participantUserIds: values.map(getUserIdFromName).filter(Boolean) })}
      />
      <RoleMultiPicker
        label="Người phê duyệt"
        values={card.approvers}
        tone="amber"
        onChange={(values) => onUpdateCard(card.id, { approvers: values, approverUserIds: values.map(getUserIdFromName).filter(Boolean) })}
      />

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onUpdateCard(card.id, { status: nextCardStatus(card.status, -1) })} className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">Lùi</button>
        <button
          type="button"
          disabled={!canMoveNext}
          title={canMoveNext ? "Chuyển sang trạng thái tiếp theo" : "Cần đủ người làm, giám sát, tham gia và phê duyệt trước khi chuyển tiếp"}
          onClick={() => onUpdateCard(card.id, { status: nextCardStatus(card.status, 1) })}
          className="flex-1 rounded-md bg-[#006b68] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Chuyển tiếp
        </button>
      </div>
      {!canMoveNext && <p className="mt-2 text-xs font-semibold text-rose-600">Cần có người làm, giám sát, tham gia và phê duyệt trước khi chuyển tiếp.</p>}
      </div>

    </aside>
  )
}

function HandoffView({ steps, currentStepId }: { steps: WorkflowStep[]; currentStepId: string }) {
  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <article key={step.id} className={clsx("grid gap-3 rounded-xl border p-4 md:grid-cols-[56px_1fr_180px]", step.id === currentStepId ? "border-[#006b68] bg-emerald-50/60" : "border-slate-200 bg-slate-50")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#006b68] text-sm font-bold text-white">{index + 1}</div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-950">{step.title}</h3>
              <span className={clsx("rounded-md border px-2 py-1 text-[11px] font-semibold", statusTone(step.status))}>{statusLabel(step.status)}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{step.actor} · {step.level} · {step.unit}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.note}</p>
          </div>
          <div className="rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
            <p className="text-xs font-semibold text-slate-500">Hạn xử lý</p>
            <p className="mt-1 font-semibold text-slate-950">{step.due}</p>
          </div>
        </article>
      ))}
    </div>
  )
}

function MembersView({ cards, phase }: { cards: WorkCard[]; phase?: Phase }) {
  const names = Array.from(new Set([
    phase?.owner,
    phase?.receiver,
    phase?.handoffTo,
    ...(phase?.participants || []),
    ...(phase?.supporters || []),
    ...cards.flatMap((card) => [card.assignee, ...card.supervisors, ...card.participants, ...card.approvers]),
  ].filter(Boolean))) as string[]

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {names.map((name) => (
        <article key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-[#006b68]">{name.charAt(0)}</span>
            <div>
              <p className="text-sm font-semibold text-slate-950">{name}</p>
              <p className="mt-1 text-xs text-slate-500">{name === phase?.owner ? "Phụ trách giai đoạn" : "Tham gia/giám sát/hỗ trợ"}</p>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}


function AuditView({ workflow, steps, cards }: { workflow: WorkflowInstance; steps: WorkflowStep[]; cards: WorkCard[] }) {
  const rows = [
    ...steps.map((step) => ({ title: step.title, actor: step.actor, body: step.note, time: step.due })),
    ...cards.map((card) => ({ title: card.title, actor: card.assignee, body: `${card.status} · ${card.checklist.filter((item) => item.doneByExecutor && item.approvedBySupervisor).length}/${card.checklist.length} checklist`, time: card.due })),
  ]
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article key={`${row.title}-${row.time}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">{row.title}</p>
              <p className="mt-1 text-xs text-slate-500">{row.actor} · {row.body}</p>
            </div>
            <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{row.time}</span>
          </div>
        </article>
      ))}
      <p className="text-xs text-slate-400">Nhật ký đang hiển thị theo phiên thử nghiệm của {workflow.code}.</p>
    </div>
  )
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
      />
    </label>
  )
}

function UserSelectField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
      >
        <option value="">Chưa chọn</option>
        {workspaceUserOptions.map((user) => (
          <option key={user} value={user}>{user}</option>
        ))}
        {value && !workspaceUserOptions.includes(value) && <option value={value} disabled>{value} (giá trị cũ - chọn user thật)</option>}
      </select>
    </label>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
      />
    </label>
  )
}

function TextField({ label, value, onChange, className }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {

  return (
    <label className={clsx("block", className)}>
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/15"
      />
    </label>
  )
}

function PriorityDot({ priority }: { priority: WorkCard["priority"] }) {
  return (
    <span
      className={clsx(
        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
        priority === "Cao" && "bg-rose-500",
        priority === "Trung bình" && "bg-amber-400",
        priority === "Thấp" && "bg-sky-500"
      )}
    />
  )
}

function SmallCount({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-sm font-bold text-[#006b68]">{value}</p>
    </div>
  )
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-[#006b68]" title={value}>{value}</p>
    </div>
  )
}
