export type AdminTemplateStatus = "lv2_review" | "lv1_review" | "published" | "returned"
export type PilotWorkflowDirection = "bottom_up" | "top_down" | "hybrid"
export type PilotTemplateCategory = "CRM" | "Hạn mức" | "Triển khai sản phẩm" | "Khác"

export const templateAdminStorageKey = "bcrm-advanced-workflow-template-admin:v1"

export interface AdminTemplatePhase {
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

export interface AdminProjectTemplate {
  id: string
  name: string
  category: string
  direction: string
  version: number
  status: AdminTemplateStatus
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
  phases: AdminTemplatePhase[]
}

export interface PilotProjectTemplate {
  id: string
  name: string
  scope: string
  category: PilotTemplateCategory
  direction: PilotWorkflowDirection
  version: number
  createdBy: string
  updatedAt: string
  status: "lv2_review" | "lv1_review" | "published" | "returned"
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

export function directionToPilotDirection(direction: string): PilotWorkflowDirection {
  const normalized = direction.trim().toLowerCase()
  if (normalized === "bottom_up" || normalized.includes("lên")) return "bottom_up"
  if (normalized === "top_down" || normalized.includes("xuống")) return "top_down"
  return "hybrid"
}

export function categoryToPilotCategory(category: string): PilotTemplateCategory {
  if (category === "CRM") return "CRM"
  if (category.includes("Hạn mức")) return "Hạn mức"
  if (category.includes("sản phẩm")) return "Triển khai sản phẩm"
  return "Khác"
}

export function mapAdminTemplateToPilotTemplate(template: AdminProjectTemplate): PilotProjectTemplate {
  return {
    id: template.id,
    name: template.name,
    scope: template.scope || template.objective,
    category: categoryToPilotCategory(template.category),
    direction: directionToPilotDirection(template.direction),
    version: template.version,
    createdBy: "Admin template",
    updatedAt: template.updatedAt,
    status: template.status,
    approvalNote: template.approvalNote,
    phaseCount: template.phases.length,
    lv2Approved: template.lv2Approved,
    lv1Approved: template.lv1Approved,
    phases: template.phases.map((phase) => ({
      title: phase.title,
      span: phase.span,
      owner: phase.owner,
      receiver: phase.receiver,
      handoffTo: phase.handoffTo,
      acceptance: phase.acceptance,
      timeline: phase.milestones,
      checklists: phase.conditions,
      forms: phase.forms,
      attachments: phase.attachments,
      stickNotes: phase.stickNotes,
    })),
  }
}

export function mergeTemplatesById<T extends { id: string }>(base: T[], incoming: T[]) {
  const next = new Map(base.map((item) => [item.id, item]))
  incoming.forEach((item) => next.set(item.id, item))
  return Array.from(next.values())
}
