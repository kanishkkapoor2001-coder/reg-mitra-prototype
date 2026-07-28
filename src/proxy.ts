import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const isDemo = request.cookies.get("reg_mitra_session")?.value === "demo";
  if (isDemo) return NextResponse.next();

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
    "/api/chat/:path*",
  ],
};
