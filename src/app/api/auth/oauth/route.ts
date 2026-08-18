import { NextResponse, type NextRequest } from "next/server";
import { INTENT_COOKIE, parseIntent } from "@/lib/billing/signup-intent";
import { parseTier } from "@/lib/billing/tiers";
import { getAppUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

// Google and Microsoft only. Anything else is rejected rather than passed
// through to Supabase, so a crafted `provider` value cannot start a flow we
// have not configured.
const PROVIDERS = { google: "google", microsoft: "azure" } as const;

function safeDestination(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/home";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  // These buttons live on /login as well as /signup, so a failure has to return
  // the visitor to the page they pressed it on. Sending someone who was signing
  // in to the sign-up page reads as "your account is gone".
  const origin = formData.get("origin") === "signup" ? "/signup" : "/login";

  if (!getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL(`${origin}?error=not_configured`, request.url), 303);
  }

  const requested = String(formData.get("provider") ?? "");
  const provider = PROVIDERS[requested as keyof typeof PROVIDERS];
  const destination = safeDestination(formData.get("from"));

  if (!provider) {
    return NextResponse.redirect(new URL(`${origin}?error=invalid_provider`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(origin, request.url), 303);
  const supabase = createSupabaseRequestClient(request, response);

  const callback = new URL("/api/auth/callback", getAppUrl(request.url));
  callback.searchParams.set("from", destination);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(new URL(`${origin}?error=provider_failed`, request.url), 303);
  }

  // Carry the cookies Supabase set on `response` over to the redirect that
  // actually leaves for the provider; dropping them breaks the PKCE exchange.
  const redirect = NextResponse.redirect(data.url, 303);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  // The provider redirects straight to the callback, so the chosen plan travels
  // in a cookie rather than the URL.
  redirect.cookies.set("reg_mitra_plan", parseTier(formData.get("plan")), {
    maxAge: 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  redirect.cookies.set(INTENT_COOKIE, parseIntent(formData.get("intent")), {
    maxAge: 60 * 60,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return redirect;
}
