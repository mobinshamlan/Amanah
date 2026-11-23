import { createClient } from "@supabase/supabase-js";
import { isFixtureMode } from "@/utils/fixtures/mode";
import { createFixtureAdminClient } from "@/utils/fixtures/store";

export function isLocalAdminEnabled() {
  return process.env.NODE_ENV === "development";
}

function createSupabaseAdminClient(url: string, secretKey: string) {
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createAdminClient() {
  // Development fixture mode: fictional in-memory data, never the real project.
  if (isFixtureMode()) {
    return createFixtureAdminClient() as unknown as ReturnType<typeof createSupabaseAdminClient>;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error("missing-admin-config");
  }

  return createSupabaseAdminClient(url, secretKey);
}
