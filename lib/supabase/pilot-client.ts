import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'

let pilotClient: ReturnType<typeof createClient> | null = null

export function isPilotSupabaseConfigured() {
  const pilotUrl = process.env.NEXT_PUBLIC_PILOT_SUPABASE_URL
  const pilotAnonKey = process.env.NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY
  const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return Boolean(pilotUrl && pilotAnonKey && pilotUrl !== productionUrl)
}

export function getPilotSupabase() {
  const pilotUrl = process.env.NEXT_PUBLIC_PILOT_SUPABASE_URL
  const pilotAnonKey = process.env.NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY
  const productionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!pilotUrl || !pilotAnonKey) return null
  if (pilotUrl === productionUrl) {
    logger.warn(
      "[PilotSupabase] Pilot URL matches production URL; pilot client disabled",
      undefined,
      { production: true }
    )
    return null
  }

  if (!pilotClient) {
    pilotClient = createClient(pilotUrl, pilotAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }

  return pilotClient
}
