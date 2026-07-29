import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

export async function proxy(request: NextRequest) {
  const session = request.cookies.get("reg_mitra_session")?.value;
  if (session === "demo") return NextResponse.next();

  if (getSupabasePublicConfig()) {
    const response = NextResponse.next({ request });
    const supabase = createSupabaseRequestClient(request, response);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const { data: membership } = await supabase
        .from("workspace_memberships")
        .select("workspace_id")
        .limit(1)
        .maybeSingle();

      if (!membership && request.nextUrl.pathname !== "/onboarding") {
        return NextResponse.redirect(new URL("/onboarding", request.url));
      }
      if (membership && request.nextUrl.pathname === "/onboarding") {
        return NextResponse.redirect(new URL("/today", request.url));
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
    "/onboarding/:path*",
    "/api/workspaces/:path*",
    "/api/clients/:path*",
    "/api/calendar/:path*",
    "/api/chat/:path*",
  ],
};
