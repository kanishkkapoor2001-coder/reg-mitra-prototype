import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

// Hybrid access model:
// - Anonymous and demo-cookie visitors keep full public/demo access. The pages
//   themselves fall back to a read-only sample workspace when no firm workspace
//   is available, so nothing here forces a login.
// - A signed-in user with no workspace is funnelled to onboarding so the real
//   product becomes reachable.
// - Billing is intentionally not gated during the pilot (no live Stripe).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!getSupabasePublicConfig()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createSupabaseRequestClient(request, response);
  const { data } = await supabase.auth.getUser();

  // Anonymous (or demo) visitors keep public access.
  if (!data.user) {
    return response;
  }

  const onboardingPath =
    pathname === "/onboarding" || pathname.startsWith("/api/workspaces");

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_memberships")
    .select("workspace_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // Fail open on a transient lookup error: never bounce a real member to
  // onboarding (which could mint an orphan second workspace) over a blip.
  if (membershipError) {
    return response;
  }

  if (!membership && !onboardingPath) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }
  if (membership && pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/today", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/today/:path*",
    "/assistant/:path*",
    "/clients/:path*",
    "/tasks/:path*",
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
