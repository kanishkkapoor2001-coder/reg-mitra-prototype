import { NextResponse, type NextRequest } from "next/server";
import { AUTH_LINK_HOURLY, AUTH_LINK_PER_ADDRESS, callerKey, checkRateLimit } from "@/lib/rate-limit";
import { sendMagicLink } from "@/lib/access/magic-link";
import { parseTier } from "@/lib/billing/tiers";
import { getAppUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

function safeDestination(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/today";
}

export async function POST(request: NextRequest) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL("/login?error=not_configured", request.url), 303);
  }

  const formData = await request.formData();
  const emailValue = formData.get("email");
  const email = typeof emailValue === "string" ? emailValue.trim().toLowerCase() : "";
  const destination = safeDestination(formData.get("from"));
  // Send the visitor back where they started, so someone who came from /signup
  // is not answered by the sign-in page.
  const origin = formData.get("origin") === "signup" ? "/signup" : "/login";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.redirect(new URL(`${origin}?error=invalid_email`, request.url), 303);
  }

  // This route mints a magic link, CREATES the auth user if absent, and sends
  // mail from the firm's verified domain — unauthenticated. Without a limit it
  // is an email cannon: unbounded spend, unbounded auth.users growth, and
  // third-party mailbombing that would burn the sending reputation the
  // newsletter depends on. Limited per caller AND per address, because one
  // attacker rotating addresses and one address hammered by many callers are
  // different abuses.
  const byCaller = checkRateLimit(callerKey(request, "auth-start"), AUTH_LINK_HOURLY);
  const byAddress = checkRateLimit(`auth-start-address:${email}`, AUTH_LINK_PER_ADDRESS);
  if (!byCaller.allowed || !byAddress.allowed) {
    return NextResponse.redirect(new URL(`${origin}?error=rate_limited`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(`${origin}?sent=1`, request.url), 303);
  // The magic link is opened from an email, so the chosen plan cannot ride on
  // the URL. Park it in a short-lived cookie for the callback to read.
  response.cookies.set("reg_mitra_plan", parseTier(formData.get("plan")), {
    maxAge: 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  const appUrl = getAppUrl(request.url);

  // Preferred path: mint the link ourselves and deliver it over Resend, which
  // avoids Supabase's development-only mailer and its per-hour cap.
  const outcome = await sendMagicLink(
    email,
    new URL("/api/auth/confirm", appUrl).toString(),
    destination,
  );
  if (outcome === "sent") return response;

  if (outcome === "failed") {
    return NextResponse.redirect(new URL(`${origin}?error=send_failed`, request.url), 303);
  }

  // Resend is not configured — fall back to Supabase's mailer so sign-in still
  // works, rate limit and all.
  const callback = new URL("/api/auth/callback", appUrl);
  callback.searchParams.set("from", destination);
  const supabase = createSupabaseRequestClient(request, response);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    const reason = error.status === 429 || /rate limit/i.test(error.message ?? "")
      ? "rate_limited"
      : "send_failed";
    return NextResponse.redirect(new URL(`${origin}?error=${reason}`, request.url), 303);
  }

  return response;
}
