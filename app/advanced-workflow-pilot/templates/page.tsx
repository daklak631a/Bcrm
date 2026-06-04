"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  ClipboardList,
  FileText,
  GitBranchPlus,
  Lock,
  Paperclip,
  Plus,
  Search,
  ShieldCheck,
  TimerReset,
  Trash2,
  Users2,
} from "lucide-react"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { resetPilotSnapshot } from "@/lib/advanced-workflow-pilot/pilot-store"
import { templateAdminStorageKey } from "@/lib/advanced-workflow-pilot/template-admin-store"
import { useAuthStore, type Role } from "@/store/useAuthStore"

type TemplateStatus = "lv2_review" | "lv1_review" | "published" | "returned"
type SetupStep = "overview" | "phases" | "forms" | "access" | "automation" | "approval"
type PhaseConfigPage = "info" | "milestones" | "conditions" | "automation" | "sticknotes"

const pilotStorageKey = "bcrm-advanced-workflow-pilot:v1"

interface RuleItem {
  label: string
  value: string
}

interface TemplatePhase {
  title: string
  owner: string
  receiver: string
  handoffTo: string
  span: number
  acceptance: string
  milestones: string[]
  conditions: string[]
  forms: string[]
  attachments?: string[]
  stickNotes?: string[]
  permissions: string[]
  automation: string[]
}

interface PermissionGroup {
  id: string
  name: string
  roles: Role[]
  scope: string
  actions: string[]
}

interface ProjectTemplate {
  id: string
  name: string
  category: string
  direction: string
  version: number
  status: TemplateStatus
  lv2Approved: boolean
  lv1Approved: boolean
  updatedAt: string
  scope: string
  objective: string
  startCondition: string
  finishCondition: string
  processingTime: string
  managementModel: string
  approvalNote: string
  governance: RuleItem[]
  dataSources: RuleItem[]
  access: RuleItem[]
  permissionGroups?: PermissionGroup[]
  automation: RuleItem[]
  phases: TemplatePhase[]
}

const roleLabels: Record<Role, string> = {
  ADMIN_LEVEL_0: "Admin LV0",
  ADMIN_LEVEL_1: "Admin LV1",
  ADMIN_LEVEL_2: "Admin LV2",
  ADMIN_LEVEL_3: "Admin LV3",
  USER: "Người dùng",
  ADVISOR: "Cố vấn",
}

const defaultPermissionGroups: PermissionGroup[] = [
  {
    id: "template-owner",
    name: "Nhóm thiết lập template",
    roles: ["ADMIN_LEVEL_2"],
    scope: "Cấu hình cấu trúc mẫu trong phạm vi phòng/chi nhánh được quản lý.",
    actions: ["Tạo mẫu", "Sửa giai đoạn", "Gán nhóm xử lý", "Trình LV1 xuất bản"],
  },
  {
    id: "template-publisher",
    name: "Nhóm xuất bản",
    roles: ["ADMIN_LEVEL_1"],
    scope: "Kiểm soát mẫu dùng chung toàn hệ thống và khóa phiên bản.",
    actions: ["Duyệt cuối", "Xuất bản", "Trả lại", "Xem nhật ký"],
  },
  {
    id: "project-operators",
    name: "Nhóm vận hành dự án",
    roles: ["USER", "ADMIN_LEVEL_3"],
    scope: "Thao tác trên công việc được phân công trong dự án áp từ template.",
    actions: ["Cập nhật công việc", "Bổ sung hồ sơ", "Trao đổi", "Hoàn tất checklist"],
  },
  {
    id: "read-only-advisors",
    name: "Nhóm cố vấn/giám sát",
    roles: ["ADVISOR"],
    scope: "Theo dõi tiến độ, cảnh báo và báo cáo nhưng không thay đổi bước duyệt.",
    actions: ["Xem báo cáo", "Xem nhật ký", "Góp ý"],
  },
]

const setupSteps: Array<{ id: SetupStep; title: string; icon: typeof ClipboardList }> = [
  { id: "overview", title: "Thông tin chung", icon: ClipboardList },
  { id: "phases", title: "Giai đoạn", icon: GitBranchPlus },
  { id: "forms", title: "Biểu mẫu", icon: FileText },
  { id: "access", title: "Phân quyền", icon: Lock },
  { id: "automation", title: "Tự động hóa", icon: BellRing },
  { id: "approval", title: "Phê duyệt", icon: ShieldCheck },
]

const phaseConfigPages: Array<{ id: PhaseConfigPage; title: string; icon: typeof ClipboardList }> = [
  { id: "info", title: "Thông tin", icon: ClipboardList },
  { id: "milestones", title: "Mốc xử lý", icon: ClipboardList },
  { id: "conditions", title: "Điều kiện", icon: BadgeCheck },
  { id: "automation", title: "Tự động hóa", icon: BellRing },
  { id: "sticknotes", title: "Sticknote", icon: FileText },
]

const initialTemplates: ProjectTemplate[] = [
  {
    id: "tpl-crm-implementation",
    name: "Triển khai CRM B2B",
    category: "CRM",
    direction: "Hỗn hợp",
    version: 2,
    status: "published",
    lv2Approved: true,
    lv1Approved: true,
    updatedAt: "02/06/2026",
    scope: "Dùng cho dự án CRM có khảo sát, chuẩn hóa dữ liệu, cấu hình hệ thống, kiểm thử và nghiệm thu.",
    objective: "Chuẩn hóa dự án triển khai CRM để mỗi đơn vị có cùng cấu trúc công việc, điều kiện bàn giao và nhật ký xử lý.",
    startCondition: "Cơ hội bán hàng được chốt và Admin LV1 phê duyệt mở dự án.",
    finishCondition: "Đủ biên bản kiểm thử, nghiệm thu và bàn giao vận hành.",
    processingTime: "16 tuần cho toàn dự án, cảnh báo sau 48 giờ nếu giai đoạn đang xử lý chưa có phản hồi.",
    managementModel: "Admin LV2 thiết lập mẫu, Admin LV1 xuất bản, người dùng áp mẫu vào dự án.",
    approvalNote: "Đã được LV2 và LV1 đồng thuận làm mẫu chung cho dự án CRM doanh nghiệp.",
    governance: [
      { label: "Loại luồng", value: "Hỗn hợp: đề xuất đi lên, triển khai đi xuống theo giai đoạn" },
      { label: "Kiểm soát phiên bản", value: "Mỗi lần chỉnh cấu trúc phải đưa mẫu về trạng thái chờ duyệt" },
      { label: "Điều kiện tạo dự án", value: "Có đơn vị triển khai, người bảo trợ, người phụ trách và ngày bắt đầu" },
    ],
    dataSources: [
      { label: "Khách hàng", value: "Thông tin khách hàng doanh nghiệp, đầu mối liên hệ và đơn vị phụ trách" },
      { label: "Cơ hội bán hàng", value: "Nhu cầu, phạm vi triển khai, sản phẩm liên quan và giá trị dự án" },
      { label: "Báo cáo", value: "Tiến độ giai đoạn, cảnh báo nghẽn, nhật ký bàn giao" },
    ],
    access: [
      { label: "Admin LV1", value: "Xuất bản mẫu, khóa phiên bản, xem nhật ký thay đổi" },
      { label: "Admin LV2", value: "Thiết lập giai đoạn, vai trò, biểu mẫu, điều kiện và thời hạn xử lý" },
      { label: "Người dùng dự án", value: "Áp mẫu, cập nhật công việc, bổ sung trao đổi và tài liệu" },
    ],
    automation: [
      { label: "Sinh công việc", value: "Tự tạo công việc con theo giai đoạn khi áp mẫu" },
      { label: "Nhắc hạn", value: "Gửi nhắc trước hạn 24 giờ, cảnh báo quản lý nếu quá hạn" },
      { label: "Chuyển giai đoạn", value: "Chỉ mở giai đoạn kế tiếp khi điều kiện nghiệm thu đã đủ" },
    ],
    phases: [
      {
        title: "Khảo sát phạm vi",
        owner: "Tổ CRM",
        receiver: "Trưởng phòng KHDN",
        handoffTo: "Khối CNTT",
        span: 2,
        acceptance: "Chốt phạm vi, danh sách người dùng, đầu mối nghiệp vụ và báo cáo cần dựng.",
        milestones: ["Khởi động với chi nhánh", "Xác nhận người bảo trợ", "Khóa phạm vi triển khai"],
        conditions: ["Có phạm vi triển khai", "Có đầu mối nghiệp vụ", "Có danh sách báo cáo"],
        forms: ["Biểu mẫu khảo sát hiện trạng", "Danh sách người dùng", "Phiếu xác nhận phạm vi"],
        permissions: ["Tổ CRM chỉnh giai đoạn", "Chi nhánh góp ý", "LV2 duyệt đầu ra"],
        automation: ["Tạo lịch khởi động", "Nhắc thiếu người duyệt sau 24 giờ"],
      },
      {
        title: "Chuẩn bị dữ liệu",
        owner: "Chi nhánh",
        receiver: "Tổ CRM",
        handoffTo: "Khối CNTT",
        span: 3,
        acceptance: "Dữ liệu nguồn có xác nhận chủ sở hữu và đủ điều kiện để cấu hình.",
        milestones: ["Xuất dữ liệu khách hàng", "Làm sạch mã số thuế", "Khóa file nhập dữ liệu"],
        conditions: ["Có file dữ liệu nguồn", "Có xác nhận dữ liệu", "Có ánh xạ trường dữ liệu"],
        forms: ["Bảng ánh xạ dữ liệu", "Biên bản xác nhận dữ liệu"],
        permissions: ["Chi nhánh cập nhật", "Tổ CRM rà soát", "LV2 khóa dữ liệu"],
        automation: ["Mở công việc làm sạch dữ liệu", "Cảnh báo file thiếu cột bắt buộc"],
      },
      {
        title: "Cấu hình hệ thống",
        owner: "Khối CNTT",
        receiver: "Tổ CRM",
        handoffTo: "Chi nhánh",
        span: 4,
        acceptance: "Luồng bán hàng, phân quyền, biểu mẫu và báo cáo hoạt động đúng theo mẫu.",
        milestones: ["Tạo luồng bán hàng", "Cấu hình vai trò", "Kiểm tra báo cáo", "Bàn giao môi trường thử"],
        conditions: ["Có vai trò theo giai đoạn", "Có biểu mẫu nhập liệu", "Có quy tắc nhắc hạn"],
        forms: ["Mẫu luồng bán hàng", "Mẫu phân quyền", "Danh sách kiểm tra cấu hình"],
        permissions: ["CNTT chỉnh quy tắc", "Tổ CRM xác nhận", "LV1 xem nhật ký"],
        automation: ["Sinh công việc kiểm thử", "Mở bước kiểm thử khi cấu hình đạt yêu cầu"],
      },
      {
        title: "Đào tạo và kiểm thử",
        owner: "Chi nhánh",
        receiver: "Khối CNTT",
        handoffTo: "Khách hàng",
        span: 3,
        acceptance: "Người dùng chạy thử xong, lỗi tồn có phân loại và người xử lý rõ ràng.",
        milestones: ["Đào tạo người dùng", "Chạy kiểm thử", "Chốt lỗi tồn"],
        conditions: ["Có danh sách người dùng kiểm thử", "Có biên bản lỗi tồn", "Có xác nhận vận hành"],
        forms: ["Biên bản đào tạo", "Phiếu tình huống kiểm thử", "Biên bản kiểm thử"],
        permissions: ["Chi nhánh cập nhật kết quả", "CNTT đóng lỗi", "LV2 duyệt vận hành"],
        automation: ["Nhắc hạn xử lý lỗi", "Đưa lỗi nghiêm trọng vào nhóm ưu tiên"],
      },
      {
        title: "Nghiệm thu",
        owner: "Khách hàng",
        receiver: "Chi nhánh",
        handoffTo: "Đầu mối vận hành",
        span: 2,
        acceptance: "Có biên bản nghiệm thu và người nhận bàn giao vận hành được chỉ định.",
        milestones: ["Chốt nghiệm thu", "Bàn giao vận hành"],
        conditions: ["Có biên bản nghiệm thu", "Có người nhận vận hành", "Có danh sách việc tồn"],
        forms: ["Biên bản nghiệm thu", "Biên bản bàn giao vận hành"],
        permissions: ["Khách hàng xác nhận", "Chi nhánh theo dõi", "LV1 xem nhật ký"],
        automation: ["Đóng không gian triển khai", "Chuyển việc tồn sang vận hành"],
      },
    ],
  },
  {
    id: "tpl-credit-limit",
    name: "Đề xuất hạn mức nhiều cấp",
    category: "Hạn mức",
    direction: "Đi lên",
    version: 1,
    status: "lv1_review",
    lv2Approved: true,
    lv1Approved: false,
    updatedAt: "25/05/2026",
    scope: "Dùng cho hồ sơ hạn mức cần bổ sung chứng từ, duyệt tại chi nhánh và phê duyệt hội sở.",
    objective: "Chuẩn hóa luồng đề xuất nhiều cấp để cán bộ không thiếu hồ sơ và quản lý thấy rõ điểm nghẽn.",
    startCondition: "Cán bộ tạo đề xuất hạn mức từ khách hàng hiện hữu hoặc yêu cầu gia hạn.",
    finishCondition: "Có quyết định hạn mức và điều kiện giải ngân đã phản hồi về chi nhánh.",
    processingTime: "7 ngày làm việc, cảnh báo sau 8 giờ nếu hồ sơ bị trả lại mà chưa có người xử lý.",
    managementModel: "Cán bộ khởi tạo, trưởng phòng kiểm tra, giám đốc chi nhánh duyệt gửi hội sở.",
    approvalNote: "LV2 đã duyệt cấu trúc quy trình; đang chờ LV1 khóa phiên bản trước khi phát hành.",
    governance: [
      { label: "Loại luồng", value: "Đi lên qua nhiều cấp phê duyệt" },
      { label: "Chứng từ bắt buộc", value: "Dòng tiền, tài sản bảo đảm, lịch sử trả nợ, ý kiến chi nhánh" },
      { label: "Kiểm soát phiên bản", value: "LV1 giữ quyền xuất bản để tránh thay đổi quy tắc tín dụng tùy tiện" },
    ],
    dataSources: [
      { label: "Khách hàng", value: "Thông tin CIF, dư nợ, lịch sử giao dịch và nhóm ngành" },
      { label: "Hồ sơ", value: "Tài sản bảo đảm, dòng tiền, lịch sử trả nợ và điều kiện giải ngân" },
      { label: "Báo cáo", value: "Tỷ lệ trả hồ sơ, thời gian chờ theo cấp, nguyên nhân nghẽn" },
    ],
    access: [
      { label: "Cán bộ", value: "Tạo đề xuất, tải hồ sơ và bổ sung chứng từ" },
      { label: "Trưởng phòng", value: "Rà soát nghiệp vụ, yêu cầu bổ sung, xác nhận đủ điều kiện" },
      { label: "Giám đốc CN / Hội sở", value: "Duyệt, trả lại, khóa điều kiện giải ngân" },
    ],
    automation: [
      { label: "Kiểm tra thiếu hồ sơ", value: "Cảnh báo khi điều kiện tín dụng còn mục trống" },
      { label: "Trả hồ sơ", value: "Gắn người phụ trách bổ sung và thời hạn phản hồi" },
      { label: "Nhật ký duyệt", value: "Lưu người duyệt, lý do trả lại và thời điểm hoàn tất" },
    ],
    phases: [
      {
        title: "Bổ sung hồ sơ",
        owner: "Cán bộ phụ trách",
        receiver: "Trưởng phòng KHDN",
        handoffTo: "Giám đốc CN",
        span: 2,
        acceptance: "Đủ dòng tiền, tài sản bảo đảm và bộ hồ sơ có thể trình chi nhánh.",
        milestones: ["Thu báo cáo dòng tiền", "Bổ sung tài sản bảo đảm"],
        conditions: ["Có dòng tiền 6 tháng", "Có tài sản bảo đảm", "Có dự thảo điều kiện giải ngân"],
        forms: ["Danh sách kiểm tra tín dụng", "Phiếu bổ sung hồ sơ"],
        permissions: ["Cán bộ tải file", "Trưởng phòng rà soát", "LV2 xem nhật ký"],
        automation: ["Cảnh báo hồ sơ thiếu", "Nhắc bổ sung sau 8 giờ"],
      },
      {
        title: "Kiểm tra chi nhánh",
        owner: "Giám đốc CN",
        receiver: "Cán bộ phụ trách",
        handoffTo: "Khối tín dụng",
        span: 2,
        acceptance: "Chi nhánh có ý kiến chính thức và hồ sơ đủ điều kiện gửi hội sở.",
        milestones: ["Rà soát hồ sơ", "Xác nhận ý kiến chi nhánh"],
        conditions: ["Có ý kiến giám đốc CN", "Có lịch sử trả nợ", "Có xác nhận rủi ro"],
        forms: ["Biên bản ý kiến chi nhánh", "Phiếu trình hội sở"],
        permissions: ["Giám đốc CN duyệt", "Cán bộ cập nhật theo yêu cầu"],
        automation: ["Tạo biên bản trình hội sở", "Khóa sửa hồ sơ sau khi gửi"],
      },
      {
        title: "Phê duyệt hội sở",
        owner: "Khối tín dụng",
        receiver: "Giám đốc CN",
        handoffTo: "Ban điều hành",
        span: 3,
        acceptance: "Có quyết định hạn mức, điều kiện giải ngân và phản hồi rõ cho chi nhánh.",
        milestones: ["Thẩm định hội sở", "Ra quyết định hạn mức"],
        conditions: ["Có kết quả thẩm định", "Có quyết định phê duyệt", "Có điều kiện giải ngân"],
        forms: ["Phiếu thẩm định", "Quyết định hạn mức"],
        permissions: ["Hội sở duyệt", "Chi nhánh theo dõi", "LV1 xem nhật ký"],
        automation: ["Sinh thông báo kết quả", "Lưu nhật ký phê duyệt theo cấp"],
      },
    ],
  },
]

const statusLabels: Record<TemplateStatus, string> = {
  lv2_review: "Chờ LV2",
  lv1_review: "Chờ LV1",
  published: "Đã xuất bản",
  returned: "Trả lại",
}

const statusClasses: Record<TemplateStatus, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-700",
  returned: "border-rose-200 bg-rose-50 text-rose-700",
  lv1_review: "border-amber-200 bg-amber-50 text-amber-700",
  lv2_review: "border-orange-200 bg-orange-50 text-orange-700",
}

export default function TemplateAdminPage() {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState(initialTemplates)
  const [selectedId, setSelectedId] = useState(initialTemplates[0].id)
  const [activeStep, setActiveStep] = useState<SetupStep>("overview")
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0)
  const [query, setQuery] = useState("")
  const [note, setNote] = useState("")
  const [resetStatus, setResetStatus] = useState("")
  const [templatesHydrated, setTemplatesHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(templateAdminStorageKey)
      if (!raw) return

      const savedTemplates = JSON.parse(raw) as ProjectTemplate[]
      if (!Array.isArray(savedTemplates) || savedTemplates.length === 0) return

      setTemplates(savedTemplates)
      setSelectedId(savedTemplates[0].id)
      setSelectedPhaseIndex(0)
      setActiveStep("overview")
    } catch {
      window.localStorage.removeItem(templateAdminStorageKey)
    } finally {
      setTemplatesHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!templatesHydrated) return
    window.localStorage.setItem(templateAdminStorageKey, JSON.stringify(templates))
  }, [templates, templatesHydrated])

  const selected = templates.find((item) => item.id === selectedId) || templates[0]
  const selectedPhase = selected.phases[selectedPhaseIndex] || selected.phases[0]
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return templates
    return templates.filter((item) =>
      `${item.name} ${item.category} ${item.scope} ${item.objective}`.toLowerCase().includes(normalized)
    )
  }, [query, templates])

  const totalMilestones = selected.phases.reduce((sum, phase) => sum + phase.milestones.length, 0)
  const totalConditions = selected.phases.reduce((sum, phase) => sum + phase.conditions.length, 0)
  const totalAutomation = selected.phases.reduce((sum, phase) => sum + phase.automation.length, 0)
  const effectiveRole: Role = user?.role || "USER"
  const isDelegatedLv2 = user?.original_role === "ADMIN_LEVEL_3" && effectiveRole === "ADMIN_LEVEL_2"
  const canLv2 = effectiveRole === "ADMIN_LEVEL_2" && selected.status === "lv2_review"
  const canLv1 = effectiveRole === "ADMIN_LEVEL_1" && selected.status === "lv1_review" && selected.lv2Approved
  const canReturn = (effectiveRole === "ADMIN_LEVEL_1" || effectiveRole === "ADMIN_LEVEL_2") && selected.status !== "published"

  const updateSelected = (patch: Partial<ProjectTemplate>) => {
    setTemplates((current) => current.map((item) => (item.id === selected.id ? { ...item, ...patch } : item)))
  }

  const updateTemplateDraft = (patch: Partial<ProjectTemplate>) => {
    setTemplates((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              ...patch,
              status: "lv2_review",
              lv2Approved: false,
              lv1Approved: false,
              updatedAt: new Date().toLocaleDateString("vi-VN"),
              approvalNote: "Template vừa được chỉnh sửa, cần Admin LV2 kiểm tra lại trước khi trình LV1.",
            }
          : item
      )
    )
  }

  const updateSelectedPhase = (patch: Partial<TemplatePhase>) => {
    updateTemplateDraft({
      phases: selected.phases.map((phase, index) => (index === selectedPhaseIndex ? { ...phase, ...patch } : phase)),
    })
  }

  const updatePhaseList = (field: keyof Pick<TemplatePhase, "milestones" | "conditions" | "forms" | "attachments" | "stickNotes" | "permissions" | "automation">, rows: string[]) => {
    updateSelectedPhase({ [field]: rows } as Partial<TemplatePhase>)
  }

  const addPhase = () => {
    const nextPhase: TemplatePhase = {
      title: `Giai đoạn ${selected.phases.length + 1}`,
      owner: "Chưa phân công",
      receiver: "Chưa xác định",
      handoffTo: "Chưa xác định",
      span: 1,
      acceptance: "Chưa thiết lập điều kiện nghiệm thu.",
      milestones: ["Mốc xử lý mới"],
      conditions: ["Điều kiện chuyển bước mới"],
      forms: ["Biểu mẫu bắt buộc mới"],
      attachments: ["Mẫu hồ sơ đính kèm mới"],
      stickNotes: ["Ghi chú hướng dẫn khi áp dụng giai đoạn"],
      permissions: ["Quyền thao tác mới"],
      automation: ["Quy tắc tự động mới"],
    }
    updateTemplateDraft({ phases: [...selected.phases, nextPhase] })
    setSelectedPhaseIndex(selected.phases.length)
  }

  const deleteSelectedPhase = () => {
    if (selected.phases.length <= 1) return
    const nextPhases = selected.phases.filter((_, index) => index !== selectedPhaseIndex)
    updateTemplateDraft({ phases: nextPhases })
    setSelectedPhaseIndex(Math.max(0, selectedPhaseIndex - 1))
  }

  const resetPilotData = async () => {
    window.localStorage.removeItem(pilotStorageKey)
    await resetPilotSnapshot(pilotStorageKey)
    setResetStatus(`Đã reset dữ liệu pilot lúc ${new Date().toLocaleTimeString("vi-VN")}`)
  }

  const createTemplate = () => {
    const id = `tpl-new-${Date.now()}`
    const template: ProjectTemplate = {
      id,
      name: "Mẫu quy trình mới",
      category: "Khác",
      direction: "Hỗn hợp",
      version: 1,
      status: "lv2_review",
      lv2Approved: false,
      lv1Approved: false,
      updatedAt: new Date().toLocaleDateString("vi-VN"),
      scope: "Mẫu mới đang chờ thiết lập phạm vi sử dụng.",
      objective: "Thiết lập cấu trúc giai đoạn, biểu mẫu, phân quyền và tự động hóa cho một loại dự án.",
      startCondition: "Người phụ trách tạo dự án và chọn mẫu quy trình.",
      finishCondition: "Tất cả giai đoạn hoàn tất điều kiện nghiệm thu.",
      processingTime: "Chưa đặt thời hạn xử lý.",
      managementModel: "Admin LV2 thiết lập mẫu, Admin LV1 xuất bản.",
      approvalNote: "Mẫu mới được tạo và đang chờ Admin LV2 thiết lập cấu trúc.",
      governance: [
        { label: "Loại luồng", value: "Chưa thiết lập" },
        { label: "Kiểm soát phiên bản", value: "Chỉnh sửa mẫu sẽ cần duyệt lại trước khi xuất bản" },
      ],
      dataSources: [{ label: "Nguồn dữ liệu", value: "Chưa thiết lập" }],
      access: [
        { label: "Admin LV2", value: "Thiết lập cấu trúc mẫu" },
        { label: "Admin LV1", value: "Duyệt và xuất bản mẫu" },
      ],
      permissionGroups: defaultPermissionGroups,
      automation: [{ label: "Nhắc hạn", value: "Chưa thiết lập" }],
      phases: [
        {
          title: "Giai đoạn mới",
          owner: "Chưa phân công",
          receiver: "Chưa xác định",
          handoffTo: "Chưa xác định",
          span: 1,
          acceptance: "Chưa thiết lập điều kiện nghiệm thu.",
          milestones: ["Mốc xử lý đầu tiên"],
          conditions: ["Điều kiện chuyển bước đầu tiên"],
          forms: ["Biểu mẫu cần bổ sung"],
          permissions: ["Quyền thao tác cần bổ sung"],
          automation: ["Quy tắc tự động cần bổ sung"],
        },
      ],
    }

    setTemplates((current) => [template, ...current])
    setSelectedId(id)
    setSelectedPhaseIndex(0)
    setActiveStep("overview")
  }

  const deleteTemplate = (templateId: string) => {
    if (templates.length <= 1) {
      window.alert("Cần giữ lại ít nhất một mẫu quy trình.")
      return
    }

    const template = templates.find((item) => item.id === templateId)
    if (!template) return

    const confirmed = window.confirm(`Xóa mẫu quy trình "${template.name}"? Thao tác này không thể hoàn tác trong phiên hiện tại.`)
    if (!confirmed) return

    setTemplates((current) => {
      const nextTemplates = current.filter((item) => item.id !== templateId)
      if (selectedId === templateId) {
        const nextSelected = nextTemplates[0]
        setSelectedId(nextSelected.id)
        setSelectedPhaseIndex(0)
        setActiveStep("overview")
      }
      return nextTemplates
    })
  }

  return (
    <DashboardLayout title="Mẫu quy trình">
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-[1480px] px-3 py-4 sm:px-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link href="/advanced-workflow-pilot" className="inline-flex items-center gap-2 text-sm font-semibold text-[#006b68]">
                <ArrowLeft className="h-4 w-4" />
                Quay lại không gian vận hành
              </Link>
              <h1 className="mt-2 text-2xl font-semibold text-slate-950">Mẫu quy trình dự án</h1>
            </div>
            <button type="button" onClick={createTemplate} className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-[#006b68] px-4 text-sm font-semibold text-white">
              <Plus className="h-4 w-4" />
              Tạo mới
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <TemplateLibrary
              query={query}
              templates={filtered}
              selectedId={selected.id}
              onQueryChange={setQuery}
              onSelect={(templateId) => {
                setSelectedId(templateId)
                setSelectedPhaseIndex(0)
                setActiveStep("overview")
              }}
              onDelete={deleteTemplate}
              canDelete={templates.length > 1}
            />

            <main className="min-w-0 rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">v{selected.version}</span>
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">{selected.category}</span>
                      <span className="rounded-md bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700">{selected.direction}</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-slate-950">{selected.name}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{selected.scope}</p>
                  </div>
                  <div className="flex flex-col gap-3 xl:items-end">
                    <button
                      type="button"
                      onClick={() => deleteTemplate(selected.id)}
                      disabled={templates.length <= 1}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                      Xóa mẫu
                    </button>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[440px]">
                      <StatTile label="Giai đoạn" value={selected.phases.length} />
                      <StatTile label="Mốc xử lý" value={totalMilestones} />
                      <StatTile label="Điều kiện" value={totalConditions} />
                      <StatTile label="Tự động" value={totalAutomation} />
                    </div>
                  </div>
                </div>

                <SetupNav activeStep={activeStep} onChange={setActiveStep} />
              </div>

              <div className="p-4 sm:p-5">
                {activeStep === "overview" && (
                  <OverviewStep selected={selected} onUpdate={updateTemplateDraft} />
                )}

                {activeStep === "phases" && (
                  <PhasesStep
                    phases={selected.phases}
                    selectedPhaseIndex={selectedPhaseIndex}
                    selectedPhase={selectedPhase}
                    processingTime={selected.processingTime}
                    onSelectPhase={setSelectedPhaseIndex}
                    onAddPhase={addPhase}
                    onDeletePhase={deleteSelectedPhase}
                    onUpdatePhase={updateSelectedPhase}
                    onUpdateTemplate={updateTemplateDraft}
                    onUpdateList={updatePhaseList}
                  />
                )}

                {activeStep === "forms" && (
                  <FormsStep
                    selected={selected}
                    selectedPhase={selectedPhase}
                    onUpdateTemplate={updateTemplateDraft}
                    onUpdateList={updatePhaseList}
                  />
                )}

                {activeStep === "access" && (
                  <AccessStep
                    selected={selected}
                    selectedPhase={selectedPhase}
                    currentRole={effectiveRole}
                    onUpdateTemplate={updateTemplateDraft}
                    onUpdateList={updatePhaseList}
                  />
                )}

                {activeStep === "automation" && (
                  <AutomationStep selected={selected} selectedPhase={selectedPhase} onUpdateTemplate={updateTemplateDraft} onUpdateList={updatePhaseList} />
                )}

                {activeStep === "approval" && (
                  <ApprovalStep
                    selected={selected}
                    currentRole={effectiveRole}
                    userName={user?.full_name || user?.name || user?.email || "Chưa đăng nhập"}
                    isDelegatedLv2={isDelegatedLv2}
                    note={note}
                    resetStatus={resetStatus}
                    canLv2={canLv2}
                    canLv1={canLv1}
                    canReturn={canReturn}
                    onNoteChange={setNote}
                    onReset={resetPilotData}
                    onApproveLv2={() => {
                      updateSelected({
                        status: "lv1_review",
                        lv2Approved: true,
                        lv1Approved: false,
                        approvalNote: note || "Admin LV2 đã duyệt cấu trúc quy trình và chuyển LV1 khóa phiên bản.",
                      })
                      setNote("")
                    }}
                    onApproveLv1={() => {
                      updateSelected({
                        status: "published",
                        lv2Approved: true,
                        lv1Approved: true,
                        approvalNote: note || "Admin LV1 đã khóa phiên bản và xuất bản mẫu dùng chung.",
                      })
                      setNote("")
                    }}
                    onReturn={() => {
                      updateSelected({
                        status: "returned",
                        lv2Approved: false,
                        lv1Approved: false,
                        approvalNote: note || "Mẫu bị trả lại để chỉnh giai đoạn, vai trò, quy tắc hoặc tài liệu đính kèm.",
                      })
                      setNote("")
                    }}
                  />
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function TemplateLibrary({
  query,
  templates,
  selectedId,
  onQueryChange,
  onSelect,
  onDelete,
  canDelete,
}: {
  query: string
  templates: ProjectTemplate[]
  selectedId: string
  onQueryChange: (value: string) => void
  onSelect: (templateId: string) => void
  onDelete: (templateId: string) => void
  canDelete: boolean
}) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] lg:overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Thư viện</p>
      <h2 className="mt-1 text-base font-semibold text-slate-950">Mẫu quy trình</h2>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Tìm mẫu theo tên, phạm vi..."
          className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#006b68]"
        />
      </div>

      <div className="mt-3 space-y-2">
        {templates.map((template) => (
          <article
            key={template.id}
            className={clsx(
              "w-full rounded-lg border p-3 text-left transition",
              selectedId === template.id
                ? "border-[#006b68] bg-emerald-50"
                : "border-slate-200 bg-white hover:bg-slate-50"
            )}
          >
            <button type="button" onClick={() => onSelect(template.id)} className="block w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{template.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{template.category} · {template.direction} · v{template.version}</p>
                </div>
                <StatusBadge status={template.status} />
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{template.scope}</p>
            </button>
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-medium text-slate-500">
              <div className="min-w-0">
                <span>{template.phases.length} giai đoạn</span>
                <span className="mx-1.5">·</span>
                <span>{template.updatedAt}</span>
              </div>
              <button
                type="button"
                onClick={() => onDelete(template.id)}
                disabled={!canDelete}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={`Xóa mẫu ${template.name}`}
                title="Xóa mẫu"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
        {templates.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
            Không tìm thấy mẫu phù hợp.
          </div>
        )}
      </div>
    </aside>
  )
}

function SetupNav({ activeStep, onChange }: { activeStep: SetupStep; onChange: (step: SetupStep) => void }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {setupSteps.map((step, index) => {
          const Icon = step.icon
          const isActive = activeStep === step.id
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onChange(step.id)}
              className={clsx(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                isActive
                  ? "border-[#006b68] bg-[#006b68] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className={clsx("flex h-5 w-5 items-center justify-center rounded text-[11px]", isActive ? "bg-white/15" : "bg-slate-100")}>
                {index + 1}
              </span>
              <Icon className="h-4 w-4" />
              {step.title}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OverviewStep({ selected, onUpdate }: { selected: ProjectTemplate; onUpdate: (patch: Partial<ProjectTemplate>) => void }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Mục đích mẫu</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <TextInput label="Tên mẫu" value={selected.name} onChange={(value) => onUpdate({ name: value })} />
          <TextInput label="Nhóm mẫu" value={selected.category} onChange={(value) => onUpdate({ category: value })} />
          <TextInput label="Kiểu luồng" value={selected.direction} onChange={(value) => onUpdate({ direction: value })} />
        </div>
        <TextAreaField label="Phạm vi sử dụng" value={selected.scope} onChange={(value) => onUpdate({ scope: value })} />
        <TextAreaField label="Mục tiêu mẫu" value={selected.objective} onChange={(value) => onUpdate({ objective: value })} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextAreaField label="Nguồn khởi tạo" value={selected.startCondition} onChange={(value) => onUpdate({ startCondition: value })} compact />
          <TextAreaField label="Điều kiện hoàn tất" value={selected.finishCondition} onChange={(value) => onUpdate({ finishCondition: value })} compact />
          <TextAreaField label="Mô hình quản trị" value={selected.managementModel} onChange={(value) => onUpdate({ managementModel: value })} compact />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quy tắc quản trị</p>
        <EditableRuleList rows={selected.governance} onChange={(rows) => onUpdate({ governance: rows })} />
      </section>
    </div>
  )
}

function PhasesStep({
  phases,
  selectedPhase,
  selectedPhaseIndex,
  processingTime,
  onSelectPhase,
  onAddPhase,
  onDeletePhase,
  onUpdatePhase,
  onUpdateTemplate,
  onUpdateList,
}: {
  phases: TemplatePhase[]
  selectedPhase: TemplatePhase
  selectedPhaseIndex: number
  processingTime: string
  onSelectPhase: (index: number) => void
  onAddPhase: () => void
  onDeletePhase: () => void
  onUpdatePhase: (patch: Partial<TemplatePhase>) => void
  onUpdateTemplate: (patch: Partial<ProjectTemplate>) => void
  onUpdateList: (field: keyof Pick<TemplatePhase, "milestones" | "conditions" | "forms" | "attachments" | "stickNotes" | "permissions" | "automation">, rows: string[]) => void
}) {
  const [phasePage, setPhasePage] = useState<PhaseConfigPage>("info")

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Thứ tự giai đoạn</p>
          <button type="button" onClick={onAddPhase} className="rounded-md bg-[#006b68] px-2.5 py-1.5 text-xs font-semibold text-white">
            + Giai đoạn
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {phases.map((phase, index) => (
            <button
              key={phase.title}
              type="button"
              onClick={() => onSelectPhase(index)}
              className={clsx(
                "w-full rounded-lg border p-3 text-left transition",
                selectedPhaseIndex === index
                  ? "border-[#006b68] bg-white text-[#006b68]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-xs font-semibold text-white">{index + 1}</span>
                <p className="text-sm font-semibold">{phase.title}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">{phase.owner} · {phase.span} tuần</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Cấu hình giai đoạn</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">{selectedPhase.title}</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {phaseConfigPages.map((page) => {
              const Icon = page.icon
              const active = phasePage === page.id
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setPhasePage(page.id)}
                  className={clsx(
                    "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition",
                    active ? "border-[#006b68] bg-[#006b68] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {page.title}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-4">
          {phasePage === "info" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                <div>
                  <TextInput label="Tên giai đoạn" value={selectedPhase.title} onChange={(value) => onUpdatePhase({ title: value })} />
                  <TextAreaField label="Điều kiện nghiệm thu/bàn giao" value={selectedPhase.acceptance} onChange={(value) => onUpdatePhase({ acceptance: value })} compact />
                </div>
                <div className="space-y-3">
                  <NumberInput label="Số tuần" value={selectedPhase.span} onChange={(value) => onUpdatePhase({ span: value })} />
                  <button
                    type="button"
                    onClick={onDeletePhase}
                    disabled={phases.length <= 1}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" />
                    Xóa giai đoạn
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <TextInput label="Phụ trách" value={selectedPhase.owner} onChange={(value) => onUpdatePhase({ owner: value })} />
                <TextInput label="Bên nhận" value={selectedPhase.receiver} onChange={(value) => onUpdatePhase({ receiver: value })} />
                <TextInput label="Bàn giao sang" value={selectedPhase.handoffTo} onChange={(value) => onUpdatePhase({ handoffTo: value })} />
              </div>
              <TextAreaField label="Thời hạn xử lý chung" value={processingTime} onChange={(value) => onUpdateTemplate({ processingTime: value })} />
            </div>
          )}

          {phasePage === "milestones" && (
            <EditableListPanel title="Mốc xử lý" rows={selectedPhase.milestones} icon={ClipboardList} onChange={(rows) => onUpdateList("milestones", rows)} />
          )}

          {phasePage === "conditions" && (
            <EditableListPanel title="Điều kiện chuyển bước" rows={selectedPhase.conditions} icon={BadgeCheck} onChange={(rows) => onUpdateList("conditions", rows)} />
          )}

          {phasePage === "automation" && (
            <EditableListPanel title="Tự động hóa theo giai đoạn" rows={selectedPhase.automation} icon={BellRing} onChange={(rows) => onUpdateList("automation", rows)} />
          )}

          {phasePage === "sticknotes" && (
            <EditableListPanel title="Sticknote / ghi chú mẫu" rows={selectedPhase.stickNotes || []} icon={FileText} onChange={(rows) => onUpdateList("stickNotes", rows)} />
          )}
        </div>
      </section>
    </div>
  )
}

function FormsStep({
  selected,
  selectedPhase,
  onUpdateTemplate,
  onUpdateList,
}: {
  selected: ProjectTemplate
  selectedPhase: TemplatePhase
  onUpdateTemplate: (patch: Partial<ProjectTemplate>) => void
  onUpdateList: (field: keyof Pick<TemplatePhase, "milestones" | "conditions" | "forms" | "attachments" | "stickNotes" | "permissions" | "automation">, rows: string[]) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Nguồn dữ liệu</p>
        <EditableRuleList rows={selected.dataSources} onChange={(rows) => onUpdateTemplate({ dataSources: rows })} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Biểu mẫu giai đoạn</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{selectedPhase.title}</h3>
        <div className="mt-4 grid gap-4">
          <EditableListPanel title="Biểu mẫu bắt buộc" rows={selectedPhase.forms} icon={FileText} onChange={(rows) => onUpdateList("forms", rows)} />
          <EditableListPanel title="Mẫu hồ sơ đính kèm" rows={selectedPhase.attachments || []} icon={Paperclip} onChange={(rows) => onUpdateList("attachments", rows)} />
          <EditableListPanel title="Sticknote kiểm tra hồ sơ" rows={selectedPhase.stickNotes || []} icon={BadgeCheck} onChange={(rows) => onUpdateList("stickNotes", rows)} />
        </div>
      </section>
    </div>
  )
}

function AccessStep({
  selected,
  selectedPhase,
  currentRole,
  onUpdateTemplate,
  onUpdateList,
}: {
  selected: ProjectTemplate
  selectedPhase: TemplatePhase
  currentRole: Role
  onUpdateTemplate: (patch: Partial<ProjectTemplate>) => void
  onUpdateList: (field: keyof Pick<TemplatePhase, "milestones" | "conditions" | "forms" | "attachments" | "stickNotes" | "permissions" | "automation">, rows: string[]) => void
}) {
  const permissionGroups = selected.permissionGroups || defaultPermissionGroups

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Vai trò trong mẫu</p>
        <EditableRuleList rows={selected.access} onChange={(rows) => onUpdateTemplate({ access: rows })} />
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
          Quyền hiện tại của bạn: <span className="font-semibold">{roleLabels[currentRole]}</span>. Template chỉ cho thao tác đúng nhóm quyền đã gán; bước duyệt không chọn thủ công bằng dropdown.
        </div>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quyền theo giai đoạn</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{selectedPhase.title}</h3>
        <div className="mt-4">
          <EditableListPanel title="Quyền thao tác" rows={selectedPhase.permissions} icon={Users2} onChange={(rows) => onUpdateList("permissions", rows)} />
        </div>
      </section>

      <section className="xl:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Phân giao quyền theo nhóm user</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">Nhóm quyền dùng khi áp template vào dự án</h3>
          </div>
          <span className="w-fit rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {permissionGroups.length} nhóm
          </span>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {permissionGroups.map((group) => (
            <PermissionGroupCard key={group.id} group={group} currentRole={currentRole} />
          ))}
        </div>
      </section>
    </div>
  )
}

function AutomationStep({
  selected,
  selectedPhase,
  onUpdateTemplate,
  onUpdateList,
}: {
  selected: ProjectTemplate
  selectedPhase: TemplatePhase
  onUpdateTemplate: (patch: Partial<ProjectTemplate>) => void
  onUpdateList: (field: keyof Pick<TemplatePhase, "milestones" | "conditions" | "forms" | "attachments" | "stickNotes" | "permissions" | "automation">, rows: string[]) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quy tắc chung</p>
        <EditableRuleList rows={selected.automation} onChange={(rows) => onUpdateTemplate({ automation: rows })} />
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Quy tắc giai đoạn</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{selectedPhase.title}</h3>
        <div className="mt-4">
          <EditableListPanel title="Tác vụ tự động" rows={selectedPhase.automation} icon={BellRing} onChange={(rows) => onUpdateList("automation", rows)} />
        </div>
      </section>
    </div>
  )
}

function PermissionGroupCard({ group, currentRole }: { group: PermissionGroup; currentRole: Role }) {
  const active = group.roles.includes(currentRole)

  return (
    <div className={clsx("rounded-lg border bg-white p-4", active ? "border-[#006b68] ring-1 ring-[#006b68]/20" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{group.name}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{group.scope}</p>
        </div>
        {active && <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">Quyền của bạn</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {group.roles.map((role) => (
          <span key={role} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {roleLabels[role]}
          </span>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {group.actions.map((action) => (
          <li key={action} className="flex gap-2 text-xs leading-5 text-slate-700">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#006b68]" />
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ApprovalStep({
  selected,
  currentRole,
  userName,
  isDelegatedLv2,
  note,
  resetStatus,
  canLv2,
  canLv1,
  canReturn,
  onNoteChange,
  onReset,
  onApproveLv2,
  onApproveLv1,
  onReturn,
}: {
  selected: ProjectTemplate
  currentRole: Role
  userName: string
  isDelegatedLv2: boolean
  note: string
  resetStatus: string
  canLv2: boolean
  canLv1: boolean
  canReturn: boolean
  onNoteChange: (value: string) => void
  onReset: () => void
  onApproveLv2: () => void
  onApproveLv1: () => void
  onReturn: () => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trạng thái duyệt</p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">{selected.name}</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ApprovalFlag label="LV2" active={selected.lv2Approved} />
          <ApprovalFlag label="LV1" active={selected.lv1Approved} />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">Trạng thái</p>
            <div className="mt-2">
              <StatusBadge status={selected.status} />
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ghi chú hiện tại</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{selected.approvalNote}</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Người thao tác hiện tại</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">{userName}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Quyền hiệu lực: <span className="font-semibold text-[#006b68]">{roleLabels[currentRole]}</span>
            {isDelegatedLv2 ? " qua ủy quyền phó phòng còn hiệu lực." : "."}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Bước duyệt được khóa theo nhóm quyền: LV2 chỉ duyệt cấu trúc, LV1 chỉ xuất bản. User thường và cố vấn không thấy quyền duyệt.
        </div>

        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Ghi chú duyệt hoặc lý do trả lại..."
          rows={5}
          className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006b68]"
        />

        <div className="mt-3 grid gap-2">
          <button disabled={!canLv2} onClick={onApproveLv2} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50">
            Admin LV2 duyệt cấu trúc
          </button>
          <button disabled={!canLv1} onClick={onApproveLv1} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 disabled:opacity-50">
            Admin LV1 xuất bản
          </button>
          <button disabled={!canReturn} onClick={onReturn} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">
            Trả lại để chỉnh
          </button>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <TimerReset className="h-4 w-4" />
          Reset dữ liệu thử
        </button>
        {resetStatus && <p className="mt-2 text-xs font-semibold text-rose-600">{resetStatus}</p>}
      </section>
    </div>
  )
}

function StatusBadge({ status }: { status: TemplateStatus }) {
  return (
    <span className={clsx("shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold", statusClasses[status])}>
      {statusLabels[status]}
    </span>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  )
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/10"
      />
    </label>
  )
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block min-w-[120px]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))}
        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/10"
      />
    </label>
  )
}

function TextAreaField({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className="mt-3 block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <textarea
        value={value}
        rows={compact ? 3 : 4}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-800 outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/10"
      />
    </label>
  )
}

function EditableRuleList({ rows, onChange }: { rows: RuleItem[]; onChange: (rows: RuleItem[]) => void }) {
  const updateRow = (index: number, patch: Partial<RuleItem>) => {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)))
  }

  const deleteRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map((row, index) => (
        <div key={`${row.label}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start gap-2">
            <input
              value={row.label}
              onChange={(event) => updateRow(index, { label: event.target.value })}
              placeholder="Tên mục"
              className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-950 outline-none focus:border-[#006b68]"
            />
            <button type="button" onClick={() => deleteRow(index)} className="rounded-md border border-rose-200 p-2 text-rose-600 hover:bg-rose-50" aria-label="Xóa mục">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={row.value}
            onChange={(event) => updateRow(index, { value: event.target.value })}
            placeholder="Nội dung"
            rows={2}
            className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm leading-5 text-slate-700 outline-none focus:border-[#006b68]"
          />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, { label: "Mục mới", value: "Nội dung cần cấu hình" }])} className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-[#006b68] px-3 text-sm font-semibold text-[#006b68]">
        <Plus className="h-4 w-4" />
        Thêm mục
      </button>
    </div>
  )
}

function RuleList({ rows }: { rows: RuleItem[] }) {
  return (
    <div className="mt-3 space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-950">{row.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{row.value}</p>
        </div>
      ))}
    </div>
  )
}

function EditableListPanel({ title, rows, icon: Icon, onChange }: { title: string; rows: string[]; icon: typeof ClipboardList; onChange: (rows: string[]) => void }) {
  const safeRows = rows.length ? rows : [""]

  const updateRow = (index: number, value: string) => {
    onChange(safeRows.map((row, rowIndex) => (rowIndex === index ? value : row)))
  }

  const deleteRow = (index: number) => {
    onChange(safeRows.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-[#006b68]" />
          <p className="text-base font-semibold text-slate-950">{title}</p>
        </div>
        <span className="w-fit rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">{safeRows.filter(Boolean).length} dòng</span>
      </div>
      <div className="mt-4 space-y-3">
        {safeRows.map((row, index) => (
          <div key={`${title}-${index}`} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[44px_minmax(0,1fr)_44px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-sm font-bold text-slate-500">{index + 1}</span>
            <input
              value={row}
              onChange={(event) => updateRow(index, event.target.value)}
              placeholder="Nhập nội dung..."
              className="h-10 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#006b68] focus:ring-2 focus:ring-[#006b68]/10"
            />
            <button type="button" onClick={() => deleteRow(index)} className="inline-flex h-10 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50" aria-label="Xóa dòng">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...safeRows.filter(Boolean), ""])} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-[#006b68] px-4 text-sm font-semibold text-[#006b68]">
        <Plus className="h-4 w-4" />
        Thêm dòng
      </button>
    </div>
  )
}

function ListPanel({ title, rows, icon: Icon }: { title: string; rows: string[]; icon: typeof ClipboardList }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[#006b68]" />
        <p className="text-sm font-semibold text-slate-950">{title}</p>
      </div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row} className="rounded-md bg-white px-3 py-2 text-sm leading-5 text-slate-700 ring-1 ring-slate-200">
            {row}
          </div>
        ))}
      </div>
    </div>
  )
}

function ApprovalFlag({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={clsx("rounded-lg border p-3", active ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50")}>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={clsx("mt-2 text-sm font-semibold", active ? "text-emerald-700" : "text-slate-500")}>
        {active ? "Đã duyệt" : "Chưa duyệt"}
      </p>
    </div>
  )
}
