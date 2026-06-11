import { getSupabase } from './client'
import { cached, invalidateCache } from './cache'
import { logAudit } from './audit'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { Plan, PlanAssignment } from '@/types/models'

export async function fetchPlans(): Promise<any> {
  return cached('plans:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('target_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Plan[]
  })
}

export async function createPlan(plan: {
  title: string
  description?: string | null
  target_date: string
}): Promise<any> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  const payload = {
    ...plan,
    created_by: user?.id || null,
  }
  const { data, error } = await supabase
    .from('plans')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'PLAN',
    entityId: data.id,
    afterValue: payload,
  })

  invalidateCache('plans:', 'plan_assignments:', 'dashboard:')
  return data as Plan
}

export async function fetchPlanAssignments(planId?: string): Promise<any> {
  return cached(`plan_assignments:${planId || 'all'}`, async () => {
    const supabase = getSupabase()
    let query = supabase
      .from('plan_assignments')
      .select('*, profiles:user_id(id, full_name, email, role, department_id), plans:plan_id(id, title, target_date)')
      .order('updated_at', { ascending: false })

    if (planId) {
      query = query.eq('plan_id', planId)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as PlanAssignment[]
  })
}

export async function upsertPlanAssignment(assignment: {
  id?: string
  plan_id: string
  user_id: string
  target_loans_amount: number
  target_deposits_amount: number
  target_calls: number
  target_cif_moi?: number
  target_bidv_direct?: number
  target_bh_nhan_tho?: number
  target_bh_khoan_vay?: number
  target_huy_dong_tang_rong?: number
  target_du_no_ngan_han_tang_rong?: number
  target_du_no_trung_han_tang_rong?: number
  target_cap_moi_hmtd?: number
  product_targets?: Record<string, number>
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...assignment,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('plan_assignments')
    .upsert(payload, { onConflict: 'plan_id,user_id' })
    .select('*, profiles:user_id(*), plans:plan_id(*)')
    .single()

  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const { product_targets: _productTargets, ...compatiblePayload } = payload
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('plan_assignments')
      .upsert(compatiblePayload, { onConflict: 'plan_id,user_id' })
      .select('*, profiles:user_id(*), plans:plan_id(*)')
      .single()

    if (compatibleError) throw compatibleError

    await logAudit({
      action: 'UPDATE',
      entityType: 'PLAN',
      entityId: compatibleData.id || `${assignment.plan_id}:${assignment.user_id}`,
      afterValue: compatiblePayload,
    })

    invalidateCache('plan_assignments:', 'plans:', 'dashboard:')
    return compatibleData as PlanAssignment
  }

  await logAudit({
    action: 'UPDATE',
    entityType: 'PLAN',
    entityId: data.id || `${assignment.plan_id}:${assignment.user_id}`,
    afterValue: payload,
  })

  invalidateCache('plan_assignments:', 'plans:', 'dashboard:')
  return data as PlanAssignment
}

// ==========================================
// WEEKLY & DAILY PLANS
// ==========================================

export async function fetchWeeklyPlans(userId: string): Promise<any> {
  return cached(`weekly_plans:${userId}`, async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    if (error) {
      logger.warn(
        "[Supabase API] weekly_plans table may not exist",
        { error: getErrorMessage(error) },
        { production: true }
      )
      return []
    }
    return data || []
  })
}

export async function fetchDailyPlans(userId: string, startDate: string, endDate: string): Promise<any> {
  return cached(`daily_plans:${userId}:${startDate}:${endDate}`, async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('target_date', startDate)
      .lte('target_date', endDate)
      .order('target_date', { ascending: true })
    if (error) {
      logger.warn(
        "[Supabase API] daily_plans table may not exist",
        { error: getErrorMessage(error) },
        { production: true }
      )
      return []
    }
    return data || []
  })
}

export async function upsertWeeklyPlan(plan: any): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...plan,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase
    .from('weekly_plans')
    .upsert(payload, { onConflict: 'user_id,start_date' })
    .select()
    .single()
  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const { product_targets: _productTargets, ...compatiblePayload } = payload
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('weekly_plans')
      .upsert(compatiblePayload, { onConflict: 'user_id,start_date' })
      .select()
      .single()
    if (compatibleError) throw compatibleError
    invalidateCache('weekly_plans:', 'daily_plans:', 'dashboard:')
    return compatibleData
  }
  invalidateCache('weekly_plans:', 'daily_plans:', 'dashboard:')
  return data
}

export async function upsertDailyPlans(plans: any[]): Promise<any> {
  const supabase = getSupabase()
  const payloads = plans.map((p: any) => ({
    ...p,
    updated_at: new Date().toISOString()
  }))
  const { data, error } = await supabase
    .from('daily_plans')
    .upsert(payloads, { onConflict: 'user_id,target_date' })
    .select()
  if (error) {
    const productTargetsMissing = /product_targets|schema cache/i.test(error.message || '')
    if (!productTargetsMissing) throw error

    const compatiblePayloads = payloads.map(({ product_targets: _productTargets, ...payload }) => payload)
    const { data: compatibleData, error: compatibleError } = await supabase
      .from('daily_plans')
      .upsert(compatiblePayloads, { onConflict: 'user_id,target_date' })
      .select()
    if (compatibleError) throw compatibleError
    invalidateCache('daily_plans:', 'weekly_plans:', 'dashboard:')
    return compatibleData
  }
  invalidateCache('daily_plans:', 'weekly_plans:', 'dashboard:')
  return data
}
