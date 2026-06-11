import { describe, expect, it } from 'vitest'
import { actsAsFieldStaff, canManageKpiPlans, getFieldStaffProfiles, isFieldStaffProfile } from './role-utils'

describe('role-utils', () => {
  it('treats USER and ADMIN_LEVEL_3 as field staff', () => {
    expect(actsAsFieldStaff({ id: 'u1', role: 'USER' })).toBe(true)
    expect(actsAsFieldStaff({ id: 'u2', role: 'ADMIN_LEVEL_3' })).toBe(true)
    expect(actsAsFieldStaff({ id: 'u3', role: 'ADMIN_LEVEL_2' })).toBe(false)
  })

  it('allows only L1/L2 to manage KPI plans', () => {
    expect(canManageKpiPlans({ role: 'ADMIN_LEVEL_1' })).toBe(true)
    expect(canManageKpiPlans({ role: 'ADMIN_LEVEL_2' })).toBe(true)
    expect(canManageKpiPlans({ role: 'ADMIN_LEVEL_3' })).toBe(false)
  })

  it('filters field staff profiles', () => {
    const profiles = [
      { id: '1', role: 'USER' },
      { id: '2', role: 'ADMIN_LEVEL_3' },
      { id: '3', role: 'ADMIN_LEVEL_2' },
    ]
    expect(getFieldStaffProfiles(profiles)).toEqual([profiles[0], profiles[1]])
    expect(isFieldStaffProfile({ role: 'ADMIN_LEVEL_3' })).toBe(true)
  })
})
