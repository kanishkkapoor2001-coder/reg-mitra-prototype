import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const config = requireSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient(config.url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
