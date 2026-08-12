import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyOperatorOfSignup, recordAccessRequest } from "@/lib/access";
import { INTENT_COOKIE, parseIntent } from "@/lib/billing/signup-intent";
import { parseTier } from "@/lib/billing/tiers";

// Session cookies live on the response the Supabase client wrote to; a fresh
// redirect must carry them over or the user lands signed-out.
function redirectPreservingSession(
  request: NextRequest,
  source: NextResponse,
  path: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

/**
 * Shared tail of every sign-in route: record the access request, notify the
 * operator the first time an address appears, and hold anyone who is not
 * approved at /pending.
 *
 * Fails closed — if standing cannot be read, the product stays shut.
 */
export async function finishSignIn(
  request: NextRequest,
  response: NextResponse,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return response;

  const metadata = user.user_metadata ?? {};
  const intent = parseIntent(request.cookies.get(INTENT_COOKIE)?.value);
  const identity = {
    authUserId: user.id,
    email: user.email,
    fullName: (metadata.full_name ?? metadata.name ?? null) as string | null,
    avatarUrl: (metadata.avatar_url ?? metadata.picture ?? null) as string | null,
    provider: (user.app_metadata?.provider ?? null) as string | null,
    requestedTier: parseTier(request.cookies.get("reg_mitra_plan")?.value),
    intent,
  };
  response.cookies.set("reg_mitra_plan", "", { maxAge: 0, path: "/" });
  response.cookies.set(INTENT_COOKIE, "", { maxAge: 0, path: "/" });

  try {
    const result = await recordAccessRequest(identity);
    // Awaited on purpose: a floating promise is not guaranteed to finish once a
    // serverless function returns its response.
    if (result.isNew) await notifyOperatorOfSignup(identity);
    if (result.status !== "approved") {
      // The intent rides along so /pending can answer a firm that asked to pay
      // with what they actually get, instead of a generic "you're on the list".
      return redirectPreservingSession(
        request,
        response,
        `/pending?status=${result.status}&intent=${intent}`,
      );
    }
  } catch (error) {
    console.error("[auth] could not record access request", error);
    return redirectPreservingSession(request, response, "/pending?error=unavailable");
  }

  return response;
}
