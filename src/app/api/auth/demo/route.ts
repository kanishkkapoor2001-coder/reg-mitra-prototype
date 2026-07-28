import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const redirectUrl = new URL(request.headers.get("referer") ?? request.url);
  redirectUrl.pathname = "/today";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set("reg_mitra_session", "demo", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
