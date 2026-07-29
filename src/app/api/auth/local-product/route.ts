import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const redirectUrl = new URL(request.headers.get("referer") ?? request.url);
  redirectUrl.pathname = "/assistant";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set("reg_mitra_session", "product", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
