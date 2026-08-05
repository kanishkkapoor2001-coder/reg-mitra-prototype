import { NextResponse, type NextRequest } from "next/server";
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

  const response = NextResponse.redirect(new URL(`${origin}?sent=1`, request.url), 303);
  const supabase = createSupabaseRequestClient(request, response);
  const callback = new URL("/api/auth/callback", getAppUrl(request.url));
  callback.searchParams.set("from", destination);
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return NextResponse.redirect(new URL(`${origin}?error=send_failed`, request.url), 303);
  }

  return response;
}
