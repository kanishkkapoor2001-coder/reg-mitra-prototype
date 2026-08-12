import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readAccessStatus } from "@/lib/access";
import { isDevAuthBypassEnabled } from "@/lib/auth/dev-bypass";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

// Hybrid access model:
// - Anonymous visitors keep public access. The pages themselves fall back to a
//   read-only sample workspace when no firm workspace is available, so nothing
//   here forces a login.
// - A signed-in user with no workspace is funnelled to onboarding so the real
//   product becomes reachable.
// - Billing is intentionally not gated during the pilot (no live Stripe).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Local dev only, and inert in any deployment — see lib/auth/dev-bypass.
  if (isDevAuthBypassEnabled()) {
    return NextResponse.next({ request });
  }

  if (!getSupabasePublicConfig()) {
    return NextResponse.next({ request });
  }

  const response = NextResponse.next({ request });
  const supabase = createSupabaseRequestClient(request, response);
  const { data } = await supabase.auth.getUser();

  // The product is behind a login.
  //
  // Anonymous visitors used to pass straight through to /today, /clients and
  // /assistant in a public sample mode. That made the signed-out sample and the
  // real product the same surface, so "Open the product" opened something that
  // was not the product, and a prospect could wander the app never knowing
  // which parts were real.
  //
  // The one exception is an explicit demo session, which is the frozen,
  // fictional walkthrough entered deliberately from /demo — never something a
  // visitor lands in by accident.
  if (!data.user) {
    if (request.cookies.get("reg_mitra_session")?.value === "demo") {
      return response;
    }
    const login = new URL("/login", request.url);
    // Send them back where they were headed once they are in.
    const target = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (target.startsWith("/") && !target.startsWith("//")) {
      login.searchParams.set("from", target);
    }
    return NextResponse.redirect(login);
  }

  // Payment is handled offline, so authentication alone does not grant access.
  // An account only reaches the product once an operator approves it; anything
  // else (pending, rejected, or a status we cannot read) waits at /pending.
  // Deliberately fails closed — an unreadable status must not open the product.
  {
    // A session with no email cannot be checked against the approval list, so
    // it is not approved. Previously this whole block was skipped in that case,
    // which would let such a session straight into the product.
    const email = data.user.email;
    let approved = false;
    if (!email) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    try {
      approved = (await readAccessStatus(email)) === "approved";
    } catch (statusError) {
      console.error("[proxy] could not read access status", statusError);
    }
    if (!approved) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
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
    // A rejected or pending account was bounced from every page but retained
    // API access to these, so it could still read its roster and post review
    // decisions.
    "/api/impacts/:path*",
    "/api/notices/:path*",
    "/api/search-index",
    "/api/admin/:path*",
  ],
};
