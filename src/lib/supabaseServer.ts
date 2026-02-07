import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serverClient: SupabaseClient | null = null;

/**
 * Supabase client for server-side use (API routes).
 * Uses SUPABASE_SERVICE_ROLE_KEY when set (bypasses RLS); otherwise anon key.
 */
export function getSupabaseServer(): SupabaseClient {
  if (!serverClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    const key = (serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? '';
    serverClient = createClient(url, key);
  }
  return serverClient;
}
