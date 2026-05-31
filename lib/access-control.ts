type ProfileLike = {
  id?: string | null
  department_id?: string | null
}

type UserLike = {
  id?: string | null
  role?: string | null
  department_id?: string | null
}

export function getVisibleProfiles(profiles: ProfileLike[], user?: UserLike | null) {
  if (!user?.id) return []
  if (user.role === "ADMIN_LEVEL_1") return profiles
  if (user.role === "ADMIN_LEVEL_2") {
    return profiles.filter((profile) => profile.department_id === user.department_id)
  }
  return profiles.filter((profile) => profile.id === user.id)
}

export function getVisibleProfileIds(profiles: ProfileLike[], user?: UserLike | null) {
  return new Set(getVisibleProfiles(profiles, user).map((profile) => profile.id).filter(Boolean))
}

export function canAccessOwner(ownerId: string | null | undefined, profiles: ProfileLike[], user?: UserLike | null) {
  if (!ownerId) return false
  return getVisibleProfileIds(profiles, user).has(ownerId)
}

export function filterCustomersByAccess<T extends { assigned_manager_id?: string | null }>(
  customers: T[],
  profiles: ProfileLike[],
  user?: UserLike | null
) {
  const visibleProfileIds = getVisibleProfileIds(profiles, user)
  return customers.filter((customer) => visibleProfileIds.has(customer.assigned_manager_id))
}

export function filterCustomerRecordsByAccess<T extends { customers?: { assigned_manager_id?: string | null } | null }>(
  records: T[],
  profiles: ProfileLike[],
  user?: UserLike | null
) {
  const visibleProfileIds = getVisibleProfileIds(profiles, user)
  return records.filter((record) => visibleProfileIds.has(record.customers?.assigned_manager_id))
}

export function filterAgentRecordsByAccess<T extends { agent_id?: string | null }>(
  records: T[],
  profiles: ProfileLike[],
  user?: UserLike | null
) {
  const visibleProfileIds = getVisibleProfileIds(profiles, user)
  return records.filter((record) => visibleProfileIds.has(record.agent_id))
}
