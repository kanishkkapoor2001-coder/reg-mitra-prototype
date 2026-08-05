import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseRequestClient } from "@/lib/supabase/request";

// Google and Microsoft only. Anything else is rejected rather than passed
// through to Supabase, so a crafted `provider` value cannot start a flow we
// have not configured.
const PROVIDERS = { google: "google", microsoft: "azure" } as const;

function safeDestination(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/today";
}

export async function POST(request: NextRequest) {
  if (!getSupabasePublicConfig()) {
    return NextResponse.redirect(new URL("/signup?error=not_configured", request.url), 303);
  }

  const formData = await request.formData();
  const requested = String(formData.get("provider") ?? "");
  const provider = PROVIDERS[requested as keyof typeof PROVIDERS];
  const destination = safeDestination(formData.get("from"));

  if (!provider) {
    return NextResponse.redirect(new URL("/signup?error=invalid_provider", request.url), 303);
  }

  const response = NextResponse.redirect(new URL("/signup", request.url), 303);
  const supabase = createSupabaseRequestClient(request, response);

  const callback = new URL("/api/auth/callback", getAppUrl(request.url));
  callback.searchParams.set("from", destination);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback.toString() },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(new URL("/signup?error=provider_failed", request.url), 303);
  }

  // Carry the cookies Supabase set on `response` over to the redirect that
  // actually leaves for the provider; dropping them breaks the PKCE exchange.
  const redirect = NextResponse.redirect(data.url, 303);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
