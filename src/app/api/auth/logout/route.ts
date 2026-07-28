import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const redirectUrl = new URL(request.headers.get("referer") ?? request.url);
  redirectUrl.pathname = "/";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });
  return response;
}
