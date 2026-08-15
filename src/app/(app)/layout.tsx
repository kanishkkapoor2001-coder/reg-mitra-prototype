import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getServerUser } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function AppGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  const sessionCookie = (await cookies()).get("reg_mitra_session")?.value;
  let sessionMode: "demo" | "product" | null = sessionCookie === "demo" ? "demo" : null;
  let workspaceName: string | null = null;

  // Both lookups are request-cached, so the page rendering beneath this layout
  // reuses them instead of asking Supabase again. This layout used to run its
  // own auth check and its own membership query on every navigation.
  if (!sessionMode && getSupabasePublicConfig()) {
    const user = await getServerUser();
    if (user) {
      sessionMode = "product";
      workspaceName = (await getCurrentWorkspace())?.name ?? null;
    }
  }

  return (
    <AppShell sessionMode={sessionMode} workspaceName={workspaceName}>
      {children}
    </AppShell>
  );
}
