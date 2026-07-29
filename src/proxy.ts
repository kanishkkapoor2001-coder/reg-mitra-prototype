import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("reg_mitra_session")?.value;
  if (session === "demo" || session === "product") return NextResponse.next();

  const loginUrl = new URL("/start", request.url);
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
