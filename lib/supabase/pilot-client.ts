import { createClient } from '@supabase/supabase-js'

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
    console.warn("Pilot Supabase bị bỏ qua vì URL đang trùng Supabase production.")
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
