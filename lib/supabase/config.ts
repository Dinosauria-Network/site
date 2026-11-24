/**
 * Supabase credentials (Phase 1b — server-side auth).
 *
 * The real values are the "publishable key" pair (`NEXT_PUBLIC_SUPABASE_URL` /
 * `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) — already set in `.env`. The legacy
 * `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY` are
 * placeholders; prefer the NEXT_PUBLIC_ vars when present.
 */
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  key:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '',
};

export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.key);
