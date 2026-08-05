import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { finishSignIn } from "@/lib/access/finish-sign-in";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

// Lands here from a magic link we minted and delivered ourselves. The hashed
// token is exchanged server-side, so the session never has to travel through a
// URL fragment the server cannot read.

function safeDestination(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/today";
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = (request.nextUrl.searchParams.get("type") ?? "magiclink") as EmailOtpType;
  const destination = safeDestination(request.nextUrl.searchParams.get("from"));

  if (!tokenHash || !getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createSupabaseRequestClient(request, response);
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired_link", request.url));
  }

  // A real session replaces any sample-workspace cookie.
  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });

  return finishSignIn(request, response, supabase);
}
