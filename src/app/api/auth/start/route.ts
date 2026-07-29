import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const redirectUrl = new URL(request.headers.get("referer") ?? request.url);
  redirectUrl.pathname = "/demo";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  return NextResponse.redirect(redirectUrl, 303);
}
