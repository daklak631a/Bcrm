import { createClient } from '@supabase/supabase-js';

// Lazy initialize supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null;

export const getSupabase = () => {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
       console.warn("Supabase credentials missing. CRM will not function properly without NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY defined.");
       // Initialize with dummy values so the app doesn't crash, but it will fail on API calls.
       return createClient('https://dummy.supabase.co', 'dummy-key');
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};
