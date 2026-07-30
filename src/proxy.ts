import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.next({ request });
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
