// App-specific Supabase admin client for server-side operations
// Uses SUPABASE_URL (app DB) and SUPABASE_SERVICE_ROLE_KEY from env
// DO NOT use this on client-side

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase admin credentials not configured.');
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

export function isAdminConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}
