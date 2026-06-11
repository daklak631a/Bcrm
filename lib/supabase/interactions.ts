import { getSupabase } from './client'
import { cached, invalidateCache } from './cache'
import { logAudit } from './audit'
import { extractDateOnly } from './mappers'

export async function fetchInteractions(): Promise<any> {
  return cached('interactions:all', async () => {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('interactions')
      .select('*, customers(id, full_name), profiles:manager_id(id, full_name)')
      .order('interaction_date', { ascending: false })
    if (error) throw error
    return data || []
  })
}

export async function fetchInteractionsByCustomer(customerId: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .select('*, profiles:manager_id(id, full_name)')
    .eq('customer_id', customerId)
    .order('interaction_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createInteraction(interaction: {
  customer_id: string
  manager_id: string
  type: string
  purpose: string
  result?: string
  notes?: string
  interaction_date?: string
  follow_up_date?: string
  next_action?: string
}): Promise<any> {
  const supabase = getSupabase()
  const payload = {
    ...interaction,
    interaction_date: extractDateOnly(interaction.interaction_date) || undefined,
    follow_up_date: extractDateOnly(interaction.follow_up_date) || undefined,
  }
  const { data, error } = await supabase
    .from('interactions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'CREATE',
    entityType: 'INTERACTION',
    entityId: data.id,
    afterValue: payload
  })

  invalidateCache('interactions:', 'dashboard:')
  return data
}

export async function updateInteraction(id: string, updates: Record<string, any>): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('interactions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  await logAudit({
    action: 'UPDATE',
    entityType: 'INTERACTION',
    entityId: id,
    afterValue: updates
  })

  invalidateCache('interactions:', 'dashboard:')
  return data
}
