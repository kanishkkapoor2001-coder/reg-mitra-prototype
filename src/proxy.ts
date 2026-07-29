import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";
import { hasFounderAccess, hasProductEntitlement } from "@/lib/billing/entitlements";

export async function proxy(request: NextRequest) {
  const session = request.cookies.get("reg_mitra_session")?.value;
  if (session === "demo") return NextResponse.next();

  if (getSupabasePublicConfig()) {
    const response = NextResponse.next({ request });
    const supabase = createSupabaseRequestClient(request, response);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const founderAccess = hasFounderAccess(data.user.email);
      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id, workspaces(subscriptions(status, trial_ends_at))")
        .limit(1)
        .maybeSingle();

      if (!membership && request.nextUrl.pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      if (membership && request.nextUrl.pathname === "/onboarding") {
        return NextResponse.redirect(new URL("/today", request.url));
      }
      if (membership) {
        const workspaceValue = membership.workspaces;
        const workspace = Array.isArray(workspaceValue) ? workspaceValue[0] : workspaceValue;
        const subscriptionValue = workspace?.subscriptions;
        const subscription = Array.isArray(subscriptionValue) ? subscriptionValue[0] : subscriptionValue;
        const billingPath = request.nextUrl.pathname === "/billing"
          || request.nextUrl.pathname.startsWith("/api/billing/checkout")
          || request.nextUrl.pathname.startsWith("/api/billing/portal");
        if (
          !billingPath
          && !founderAccess
          && !hasProductEntitlement(subscription?.status, subscription?.trial_ends_at)
        ) {
          return NextResponse.redirect(new URL("/billing", request.url));
        }
      }
      return response;
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/today/:path*",
    "/assistant/:path*",
    "/clients/:path*",
    "/calendar/:path*",
    "/briefings/:path*",
    "/regulations/:path*",
    "/settings/:path*",
    "/billing/:path*",
    "/onboarding/:path*",
    "/api/workspaces/:path*",
    "/api/clients/:path*",
    "/api/tasks/:path*",
    "/api/messages/:path*",
    "/api/billing/checkout/:path*",
    "/api/billing/portal/:path*",
    "/api/calendar/:path*",
    "/api/chat/:path*",
    "/api/connectors/:path*",
  ],
};
