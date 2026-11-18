import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigError =
  supabaseUrl && supabaseAnonKey
    ? null
    : 'Chybí EXPO_PUBLIC_SUPABASE_URL nebo EXPO_PUBLIC_SUPABASE_ANON_KEY v souboru .env.';

function createSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabase();
