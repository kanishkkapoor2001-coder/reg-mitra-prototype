import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

export async function POST(request: import("next/server").NextRequest) {
  const redirectUrl = new URL(request.headers.get("referer") ?? request.url);
  redirectUrl.pathname = "/";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  const response = NextResponse.redirect(redirectUrl, 303);

  if (getSupabasePublicConfig()) {
    const supabase = createSupabaseRequestClient(request, response);
    await supabase.auth.signOut();
  }

  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });
  return response;
}
