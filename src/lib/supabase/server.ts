import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { requireSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * The signed-in user, once per request. `auth.getUser()` is a network call to
 * Supabase Auth; before this, the layout, the page and getCurrentWorkspace each
 * made it separately on every navigation — three identical round trips per
 * click. react `cache` collapses them to one. Route handlers are unaffected:
 * each request gets its own cache scope.
 */
export const getServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export async function createSupabaseServerClient() {
  const config = requireSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes
          // sessions before protected routes are rendered.
        }
      },
    },
  });
}
