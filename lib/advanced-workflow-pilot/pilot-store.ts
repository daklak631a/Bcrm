import { getPilotSupabase, isPilotSupabaseConfigured } from "@/lib/supabase/pilot-client"
import { logger } from "@/lib/logger"

export type PilotStorageMode = "supabase-pilot" | "local"

export interface PilotStoreResult<T> {
  mode: PilotStorageMode
  payload: T | null
  savedAt?: string
}

export function getPilotStorageMode(): PilotStorageMode {
  return isPilotSupabaseConfigured() ? "supabase-pilot" : "local"
}

export async function loadPilotSnapshot<T>(snapshotKey: string): Promise<PilotStoreResult<T>> {
  const supabase = getPilotSupabase()
  if (!supabase) return { mode: "local", payload: null }

  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) return { mode: "local", payload: null }

  const table = (supabase as any).schema("pilot_crm").from("pilot_state_snapshots")
  const { data, error } = await table
    .select("payload, updated_at")
    .eq("snapshot_key", snapshotKey)
    .eq("user_id", userId)
    .maybeSingle() as {
      data: { payload: unknown; updated_at?: string } | null
      error: { message: string } | null
    }

  if (error) {
    logger.warn(
      "[PilotStore] Supabase load failed, falling back to localStorage",
      { error: error.message },
      { production: true }
    )
    return { mode: "local", payload: null }
  }

  return {
    mode: "supabase-pilot",
    payload: (data?.payload as T | null) || null,
    savedAt: data?.updated_at,
  }
}

export async function savePilotSnapshot<T>(snapshotKey: string, payload: T): Promise<PilotStorageMode> {
  const supabase = getPilotSupabase()
  if (!supabase) return "local"

  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) return "local"

  const table = (supabase as any).schema("pilot_crm").from("pilot_state_snapshots")
  const { error } = await table
    .upsert(
      {
        snapshot_key: snapshotKey,
        user_id: userId,
        payload,
      },
      { onConflict: "snapshot_key,user_id" }
    )

  if (error) {
    logger.warn(
      "[PilotStore] Supabase save failed, falling back to localStorage",
      { error: error.message },
      { production: true }
    )
    return "local"
  }

  return "supabase-pilot"
}

export async function resetPilotSnapshot(snapshotKey: string): Promise<PilotStorageMode> {
  const supabase = getPilotSupabase()
  if (!supabase) return "local"

  const { data: userResult } = await supabase.auth.getUser()
  const userId = userResult.user?.id
  if (!userId) return "local"

  const table = (supabase as any).schema("pilot_crm").from("pilot_state_snapshots")
  const { error } = await table
    .delete()
    .eq("snapshot_key", snapshotKey)
    .eq("user_id", userId)

  if (error) {
    logger.warn(
      "[PilotStore] Supabase reset failed, falling back to localStorage",
      { error: error.message },
      { production: true }
    )
    return "local"
  }

  return "supabase-pilot"
}
