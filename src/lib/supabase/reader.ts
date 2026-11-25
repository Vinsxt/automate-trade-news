import { createClient } from "@supabase/supabase-js";

export class SupabaseReaderConfigurationError extends Error {}

export function createSupabaseReader() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) throw new SupabaseReaderConfigurationError("Supabase reader is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
