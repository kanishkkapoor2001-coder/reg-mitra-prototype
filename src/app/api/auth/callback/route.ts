import { NextResponse, type NextRequest } from "next/server";
import { notifyOperatorOfSignup, recordAccessRequest } from "@/lib/access";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

function safeDestination(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/onboarding";
}

// Session cookies live on the original response; a fresh redirect must carry
// them over or the user lands signed-out.
function redirectPreservingSession(
  request: NextRequest,
  source: NextResponse,
  path: string,
): NextResponse {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeDestination(request.nextUrl.searchParams.get("from"));

  if (!code || !getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL("/login?error=invalid_link", request.url));
  }

  const response = NextResponse.redirect(new URL(destination, request.url));
  const supabase = createSupabaseRequestClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=expired_link", request.url));
  }

  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) return response;

  const metadata = user.user_metadata ?? {};
  const identity = {
    authUserId: user.id,
    email: user.email,
    fullName: (metadata.full_name ?? metadata.name ?? null) as string | null,
    avatarUrl: (metadata.avatar_url ?? metadata.picture ?? null) as string | null,
    provider: (user.app_metadata?.provider ?? null) as string | null,
  };

  let status: string;
  try {
    const result = await recordAccessRequest(identity);
    status = result.status;
    // Awaited on purpose: a floating promise is not guaranteed to finish once a
    // serverless function returns its response.
    if (result.isNew) await notifyOperatorOfSignup(identity);
  } catch (recordError) {
    // Authenticated, but standing is unknown. Sending them onward would defeat
    // the approval gate, so hold them at the waiting page instead of failing open.
    console.error("[auth/callback] could not record access request", recordError);
    return redirectPreservingSession(request, response, "/pending?error=unavailable");
  }

  if (status !== "approved") {
    return redirectPreservingSession(request, response, `/pending?status=${status}`);
  }

  return response;
}
