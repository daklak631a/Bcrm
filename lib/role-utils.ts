export type RoleLike = string | null | undefined

export type AuthUserLike = {
  id?: string | null
  role?: RoleLike
  original_role?: RoleLike
  department_id?: string | null
}

/** Chuyên viên thực địa: USER hoặc Admin L3 (khi chưa được ủy quyền L2). */
export function actsAsFieldStaff(user?: AuthUserLike | null): boolean {
  if (!user?.id) return false
  if (user.role === 'USER') return true
  if (user.role === 'ADMIN_LEVEL_3') return true
  return false
}

/** Admin được giao / phân bổ KPI (L1, L2; hoặc L3 khi được ủy quyền L2). */
export function canManageKpiPlans(user?: AuthUserLike | null): boolean {
  return user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2'
}

export function isFieldStaffProfile(profile: { role?: RoleLike }): boolean {
  return profile.role === 'USER' || profile.role === 'ADMIN_LEVEL_3'
}

export function getFieldStaffProfiles<T extends { role?: RoleLike }>(profiles: T[]): T[] {
  return profiles.filter(isFieldStaffProfile)
}
