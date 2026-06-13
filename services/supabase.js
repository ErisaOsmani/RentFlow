import { createClient } from '@supabase/supabase-js';

// Vlerat merren nga .env qe te mos ruhen kredencialet direkt ne kod.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Kontrollon qe URL/key jane reale para se app-i te vazhdoje.
const hasValidSupabaseUrl =
  typeof supabaseUrl === 'string' && /^https?:\/\//.test(supabaseUrl);
const hasValidSupabaseKey =
  typeof supabaseKey === 'string' &&
  supabaseKey.length > 0 &&
  supabaseKey !== 'your_supabase_anon_key';

if (!hasValidSupabaseUrl || !hasValidSupabaseKey) {
  throw new Error(
    'Invalid Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL to your real https:// project URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your real anon key in .env.'
  );
}

// Klienti kryesor qe perdoret nga te gjitha services/screens per query ne Supabase.
export const supabase = createClient(supabaseUrl, supabaseKey);
