import { describe, expect, it } from "vitest"
import {
  canAccessOwner,
  filterAgentRecordsByAccess,
  filterCustomerRecordsByAccess,
  filterCustomersByAccess,
  getVisibleProfileIds,
  getVisibleProfiles,
} from "@/lib/access-control"

const profiles = [
  { id: "admin", department_id: "head-office" },
  { id: "manager-a", department_id: "branch-a" },
  { id: "advisor-a", department_id: "branch-a" },
  { id: "advisor-b", department_id: "branch-b" },
]

describe("access control", () => {
  it("returns no profiles for an unauthenticated user", () => {
    expect(getVisibleProfiles(profiles, null)).toEqual([])
  })

  it("allows a level 1 admin to see all profiles", () => {
    expect(getVisibleProfiles(profiles, { id: "admin", role: "ADMIN_LEVEL_1" })).toEqual(profiles)
  })

  it("limits a level 2 admin to their department", () => {
    expect(
      getVisibleProfiles(profiles, {
        id: "manager-a",
        role: "ADMIN_LEVEL_2",
        department_id: "branch-a",
      })
    ).toEqual([profiles[1], profiles[2]])
  })

  it("limits a regular user to their own profile", () => {
    expect(getVisibleProfiles(profiles, { id: "advisor-b", role: "ADVISOR" })).toEqual([profiles[3]])
  })

  it("limits admin level 3 to their own profile like field staff", () => {
    expect(
      getVisibleProfiles(profiles, {
        id: "manager-a",
        role: "ADMIN_LEVEL_3",
        department_id: "branch-a",
      })
    ).toEqual([profiles[1]])
  })

  it("creates a set containing only accessible profile ids", () => {
    const ids = getVisibleProfileIds(profiles, {
      id: "manager-a",
      role: "ADMIN_LEVEL_2",
      department_id: "branch-a",
    })

    expect(Array.from(ids)).toEqual(["manager-a", "advisor-a"])
  })

  it("checks ownership against the current access scope", () => {
    const user = { id: "advisor-a", role: "ADVISOR" }

    expect(canAccessOwner("advisor-a", profiles, user)).toBe(true)
    expect(canAccessOwner("advisor-b", profiles, user)).toBe(false)
    expect(canAccessOwner(null, profiles, user)).toBe(false)
  })

  it("filters customers and nested customer records by manager access", () => {
    const user = {
      id: "manager-a",
      role: "ADMIN_LEVEL_2",
      department_id: "branch-a",
    }
    const customers = [
      { id: "customer-a", assigned_manager_id: "advisor-a" },
      { id: "customer-b", assigned_manager_id: "advisor-b" },
    ]
    const records = customers.map((customer) => ({
      id: `record-${customer.id}`,
      customers: customer,
    }))

    expect(filterCustomersByAccess(customers, profiles, user)).toEqual([customers[0]])
    expect(filterCustomerRecordsByAccess(records, profiles, user)).toEqual([records[0]])
  })

  it("filters agent-owned records by access scope", () => {
    const records = [
      { id: "sale-a", agent_id: "advisor-a" },
      { id: "sale-b", agent_id: "advisor-b" },
      { id: "sale-none", agent_id: null },
    ]

    expect(filterAgentRecordsByAccess(records, profiles, { id: "advisor-a", role: "ADVISOR" })).toEqual([
      records[0],
    ])
  })
})
