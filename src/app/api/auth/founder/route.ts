import { NextResponse, type NextRequest } from "next/server";
import {
  getFounderAccessEmails,
  isValidFounderAccessCode,
} from "@/lib/auth/founder-access";
import { getAppUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FOUNDER_CODE_HOURLY, callerKey, checkRateLimit } from "@/lib/rate-limit";

function safeDestination(value: FormDataEntryValue | null): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/today";
}

function founderUrl(request: NextRequest, error: string, destination: string) {
  const url = new URL("/founder", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("from", destination);
  return url;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const destination = safeDestination(formData.get("from"));
  const submittedCode = formData.get("access_code");
  const code = typeof submittedCode === "string" ? submittedCode : "";
  const founderEmail = getFounderAccessEmails()[0];

  if (!getSupabasePublicConfig() || !founderEmail || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.redirect(founderUrl(request, "not_configured", destination), 303);
  }

  // A shared secret with unlimited attempts is a guessing game the attacker
  // eventually wins, and success grants operator access to every applicant's
  // contact details and the approve/reject control.
  const limited = checkRateLimit(callerKey(request, "founder-code"), FOUNDER_CODE_HOURLY);
  if (!limited.allowed) {
    return NextResponse.redirect(founderUrl(request, "rate_limited", destination), 303);
  }

  if (!isValidFounderAccessCode(code)) {
    return NextResponse.redirect(founderUrl(request, "invalid_code", destination), 303);
  }

  const admin = createSupabaseAdminClient();
  const callback = new URL("/api/auth/callback", getAppUrl(request.url));
  callback.searchParams.set("from", destination);
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: founderEmail,
    options: { redirectTo: callback.toString() },
  });
  const tokenHash = data?.properties?.hashed_token;

  if (error || !tokenHash) {
    return NextResponse.redirect(founderUrl(request, "unavailable", destination), 303);
  }

  const directUrl = new URL("/api/auth/direct", getAppUrl(request.url));
  directUrl.searchParams.set("token_hash", tokenHash);
  directUrl.searchParams.set("from", destination);
  return NextResponse.redirect(directUrl, 303);
}
