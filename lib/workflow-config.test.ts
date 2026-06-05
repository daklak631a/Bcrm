import { describe, expect, it } from "vitest"
import {
  defaultWorkflowConfig,
  getBusinessActionsForRole,
  getEffectiveWorkflowStepActions,
  getWorkflowRolePresetActions,
  hasWorkflowStepPermission,
  type WorkflowConfig,
} from "./workflow-config"

function cloneConfig(): WorkflowConfig {
  return JSON.parse(JSON.stringify(defaultWorkflowConfig)) as WorkflowConfig
}

describe("workflow permission matrix", () => {
  it("uses business permission group as the preset for workflow step roles", () => {
    const config = cloneConfig()
    const workflow = config.workflowPermissions.find((item) => item.id === "wf-customer-sales")

    expect(workflow).toBeDefined()
    expect(getWorkflowRolePresetActions(config, workflow!, "ADMIN_LEVEL_2")).toEqual([
      "view",
      "update",
      "assign",
      "approve",
    ])
  })

  it("only grants actions that exist in both the business group and the workflow step", () => {
    const config = cloneConfig()

    expect(getBusinessActionsForRole(config, { ownerUnit: "Khối bán hàng" }, "ADMIN_LEVEL_1")).toEqual([
      "view",
      "approve",
      "export",
    ])
    expect(getEffectiveWorkflowStepActions(config, "wf-customer-sales", "sales-report", "ADMIN_LEVEL_1")).toEqual([
      "view",
      "export",
    ])
    expect(hasWorkflowStepPermission(config, {
      role: "ADMIN_LEVEL_1",
      workflowId: "wf-customer-sales",
      stepId: "sales-report",
      action: "approve",
    })).toBe(false)
  })

  it("does not grant a step permission when the user role does not match the step owner role", () => {
    const config = cloneConfig()

    expect(getEffectiveWorkflowStepActions(config, "wf-system-config", "system-design", "ADMIN_LEVEL_1")).toEqual([])
    expect(hasWorkflowStepPermission(config, {
      role: "ADMIN_LEVEL_1",
      workflowId: "wf-system-config",
      stepId: "system-design",
      action: "configure",
    })).toBe(false)
  })

  it("grants configure for the system-design step to ADMIN_LEVEL_0", () => {
    const config = cloneConfig()

    expect(hasWorkflowStepPermission(config, {
      role: "ADMIN_LEVEL_0",
      workflowId: "wf-system-config",
      stepId: "system-design",
      action: "configure",
    })).toBe(true)
  })
})
