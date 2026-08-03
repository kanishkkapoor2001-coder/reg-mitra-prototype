import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  normalizeEmail,
  resolveOrganizationDomain,
} from "@/lib/trials/domain";

function redirect(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/start?${query}`, request.url), 303);
}

export async function POST(request: Request) {
  // A body that is not form-encoded (a bot, a stray JSON POST) makes formData()
  // throw. That is a bad request, not a server fault — answer 400, never 500.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const contactName = String(formData.get("contact_name") ?? "").trim();
  const organizationName = String(formData.get("organization_name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const suppliedDomain = String(formData.get("organization_domain") ?? "");

  if (
    !email
    || contactName.length < 2
    || contactName.length > 120
    || organizationName.length < 2
    || organizationName.length > 160
  ) return redirect(request, "error=invalid_request");

  const resolved = resolveOrganizationDomain(email, suppliedDomain);
  if (!resolved.domain) return redirect(request, `error=${resolved.reason ?? "invalid_request"}`);

  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = forwardedFor
    ? createHash("sha256").update(forwardedFor).digest("hex")
    : null;

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc("submit_trial_request", {
      request_contact_name: contactName,
      request_email: email,
      request_organization_domain: resolved.domain,
      request_organization_name: organizationName,
      request_ip_hash: ipHash,
      request_user_agent: userAgent,
    });

    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    return result?.eligible
      ? redirect(request, "submitted=1")
      : redirect(request, "duplicate=1");
  } catch {
    return redirect(request, "error=unavailable");
  }
}
