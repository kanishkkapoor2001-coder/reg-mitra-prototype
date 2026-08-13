import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyOperatorOfSignup, recordAccessRequest } from "@/lib/access";
import { autoApproveTrial } from "@/lib/access/approve";
import { INTENT_COOKIE, parseIntent } from "@/lib/billing/signup-intent";
import { parseTier } from "@/lib/billing/tiers";
import { emailDomain, isPublicEmailDomain } from "@/lib/trials/domain";

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
    firm: (metadata.firm ?? null) as string | null,
  };
  response.cookies.set("reg_mitra_plan", "", { maxAge: 0, path: "/" });
  response.cookies.set(INTENT_COOKIE, "", { maxAge: 0, path: "/" });

  try {
    let result = await recordAccessRequest(identity);
    let autoApproved = false;

    // A free trial should start when they ask for it, not when someone reads an
    // email. Only trials, and only from a firm's own domain — a paid request
    // still goes to a human, because that conversation is the point.
    //
    // Runs before the operator alert so the alert can say "already in" rather
    // than asking for a decision that has already been made.
    if (result.status === "pending" && intent === "trial") {
      const domain = emailDomain(user.email);
      if (domain && !isPublicEmailDomain(domain)) {
        const outcome = await autoApproveTrial(user.email);
        if (outcome.approved) {
          autoApproved = true;
          result = { ...result, status: "approved" };
        } else {
          console.error("[auth] trial auto-approval failed", outcome.reason);
        }
      }
    }

    // Awaited on purpose: a floating promise is not guaranteed to finish once a
    // serverless function returns its response.
    if (result.isNew) await notifyOperatorOfSignup({ ...identity, autoApproved });

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
