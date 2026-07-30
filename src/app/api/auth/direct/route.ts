import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

function safeDestination(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/today";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const destination = safeDestination(request.nextUrl.searchParams.get("from"));

  if (!tokenHash || !getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createSupabaseRequestClient(request, response);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired_link", request.url));
  }

  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });
  return response;
}
