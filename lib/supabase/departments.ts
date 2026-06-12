import { getSupabase } from './client'
import { DEFAULT_CACHE_TTL_MS, LONG_CACHE_TTL_MS, PageResult, cached, invalidateCache, pageRange } from './cache'

export type Department = {
  id: string
  code: string
  name: string
  description?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type DepartmentInput = {
  code: string
  name: string
  description?: string | null
  is_active?: boolean
}

export async function fetchActiveDepartments(): Promise<Department[]> {
  return cached('departments:active', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data || []) as Department[]
  }, LONG_CACHE_TTL_MS)
}

export async function fetchDepartmentsPage(input: {
  page?: number
  pageSize?: number
  includeInactive?: boolean
} = {}): Promise<PageResult<Department>> {
  const { page, pageSize, from, to } = pageRange(input.page, input.pageSize, 100)
  const cacheKey = ['departments:page', page, pageSize, input.includeInactive ? 'all' : 'active'].join(':')

  return cached(cacheKey, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('departments')
      .select('*', { count: 'exact' })
      .order('name')
      .range(from, to)

    if (!input.includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error, count } = await query
    if (error) throw error
    return { data: (data || []) as Department[], total: count || 0, page, pageSize }
  }, DEFAULT_CACHE_TTL_MS)
}

export async function createDepartment(input: DepartmentInput): Promise<Department> {
  const supabase = getSupabase()
  const payload = {
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    is_active: input.is_active ?? true,
  }
  const { data, error } = await supabase.from('departments').insert(payload).select().single()
  if (error) throw error
  invalidateCache('departments:')
  return data as Department
}

export async function updateDepartment(id: string, updates: Partial<DepartmentInput>): Promise<Department> {
  const supabase = getSupabase()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.code !== undefined) payload.code = updates.code.trim()
  if (updates.name !== undefined) payload.name = updates.name.trim()
  if (updates.description !== undefined) payload.description = updates.description?.trim() || null
  if (updates.is_active !== undefined) payload.is_active = updates.is_active

  const { data, error } = await supabase.from('departments').update(payload).eq('id', id).select().single()
  if (error) throw error
  invalidateCache('departments:')
  return data as Department
}

export function resolveDepartmentCode(
  rawValue: string,
  departments: Pick<Department, 'code' | 'name'>[]
): string | null {
  const normalized = rawValue.trim()
  if (!normalized) return null

  const slug = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '')

  const exact = departments.find(
    (dept) => dept.code === normalized || dept.name === normalized
  )
  if (exact) return exact.code

  const targetSlug = slug(normalized)
  const fuzzy = departments.find(
    (dept) => slug(dept.code) === targetSlug || slug(dept.name) === targetSlug
  )
  return fuzzy?.code || normalized
}
