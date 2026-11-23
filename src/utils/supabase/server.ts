import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isFixtureMode } from "@/utils/fixtures/mode";

export async function createClient() {
  if (isFixtureMode()) {
    throw new Error("Supabase is disabled in local fixture mode.");
  }
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Cache headers from the second argument are applied in proxy.ts.
          // Server Components cannot set response headers here.
          void headers;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}
