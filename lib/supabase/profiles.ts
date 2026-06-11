import { getSupabase } from './client'
import {
  CurrentUserScope,
  DEFAULT_CACHE_TTL_MS,
  LONG_CACHE_TTL_MS,
  PageResult,
  cached,
  isDepartmentRole,
  isGlobalRole,
  normalizeSearchTerm,
  pageRange,
} from './cache'

export type ProfilePageInput = {
  page?: number
  pageSize?: number
  search?: string
  role?: string
  departmentId?: string | null
  includeInactive?: boolean
  user?: CurrentUserScope | null
}

export type AllowedEmailPageInput = {
  page?: number
  pageSize?: number
  search?: string
  departmentId?: string | null
  includeInactive?: boolean
  user?: CurrentUserScope | null
}

export async function fetchProfiles(): Promise<any> {
  return cached('profiles:active', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,department_id,is_active,full_name_slug,short_name,created_at,updated_at')
      .eq('is_active', true)
      .order('full_name')
    if (error) throw error
    return data || []
  }, LONG_CACHE_TTL_MS)
}

export async function fetchProfilesPage(input: ProfilePageInput = {}): Promise<PageResult<any>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const search = normalizeSearchTerm(input.search)
  const cacheKey = [
    'profiles:page',
    page,
    pageSize,
    search,
    input.role || 'all',
    input.departmentId || 'all',
    input.includeInactive ? 'all-status' : 'active',
    input.user?.role || 'anonymous',
    input.user?.department_id || input.user?.branchId || 'all',
  ].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('profiles')
      .select('id,email,full_name,role,department_id,is_active,full_name_slug,short_name,created_at,updated_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!input.includeInactive) {
      query = query.eq('is_active', true)
    }

    if (input.role) {
      query = query.eq('role', input.role)
    }

    const scopedDepartment = input.departmentId || (
      isDepartmentRole(input.user?.role) ? input.user?.department_id || input.user?.branchId || null : null
    )
    if (scopedDepartment) {
      query = query.eq('department_id', scopedDepartment)
    }

    if (!isGlobalRole(input.user?.role) && !isDepartmentRole(input.user?.role) && input.user?.id) {
      query = query.eq('id', input.user.id)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: data || [], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function fetchAllowedEmailsPage(input: AllowedEmailPageInput = {}): Promise<PageResult<any>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const search = normalizeSearchTerm(input.search)
  const scopedDepartment = input.departmentId || (
    isDepartmentRole(input.user?.role) ? input.user?.department_id || input.user?.branchId || null : null
  )
  const cacheKey = [
    'allowed_emails:page',
    page,
    pageSize,
    search,
    scopedDepartment || 'all',
    input.includeInactive ? 'all-status' : 'active',
    input.user?.role || 'anonymous',
  ].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('allowed_emails')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (!input.includeInactive) {
      query = query.eq('is_active', true)
    }

    if (scopedDepartment) {
      query = query.eq('department_id', scopedDepartment)
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,department_id.ilike.%${search}%`)
    }

    const { data, error, count } = await query
    if (error) throw error

    return { data: data || [], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function fetchProfileById(id: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function fetchAllowedEmails(): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createAllowedEmail(entry: {
  email: string
  full_name: string
  role?: string
  department_id?: string
  is_active?: boolean
}): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .insert(entry)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAllowedEmail(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('allowed_emails')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAllowedEmail(id: string): Promise<any> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('id', id)
  if (error) throw error
}
