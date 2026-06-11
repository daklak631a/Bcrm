import { getSupabase } from './client'
import { LONG_CACHE_TTL_MS, cached, invalidateCache } from './cache'
import { getErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function fetchSystemSettings(): Promise<any[]> {
  return cached('system_settings:all', async () => {
    const supabase = getSupabase()
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
      if (error) {
        logger.warn(
          "[Supabase API] system_settings table may not exist",
          { error: getErrorMessage(error) },
          { production: true }
        )
        return []
      }
      return data || []
    } catch (err) {
      logger.warn(
        "[Supabase API] Failed to fetch system settings",
        { error: getErrorMessage(err) },
        { production: true }
      )
      return []
    }
  }, LONG_CACHE_TTL_MS)
}

export async function updateSystemSetting(key: string, value: string): Promise<any> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  invalidateCache('system_settings:')
  return data
}
