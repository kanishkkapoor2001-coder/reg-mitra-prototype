import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  const sessionCookie = (await cookies()).get("reg_mitra_session")?.value;
  let sessionMode: "demo" | "product" | null = sessionCookie === "demo" ? "demo" : null;
  let workspaceName: string | null = null;

  if (!sessionMode && getSupabasePublicConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      sessionMode = "product";
      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspaces(name)")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const workspaceValue = membership?.workspaces;
      const workspace = Array.isArray(workspaceValue) ? workspaceValue[0] : workspaceValue;
      workspaceName = workspace?.name ?? null;
    }
  }

  return (
    <AppShell sessionMode={sessionMode} workspaceName={workspaceName}>
      {children}
    </AppShell>
  );
}
