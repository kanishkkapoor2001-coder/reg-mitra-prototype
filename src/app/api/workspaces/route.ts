import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { hasFounderAccess } from "@/lib/billing/entitlements";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeEmail,
  resolveOrganizationDomain,
} from "@/lib/trials/domain";

function redirectWithError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/onboarding?error=${error}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) return redirectWithError(request, "not_configured");

  const formData = await request.formData();
  const nameValue = formData.get("name");
  const slugValue = formData.get("slug");
  const domainValue = formData.get("organization_domain");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const slug = typeof slugValue === "string" ? slugValue.trim().toLowerCase() : "";
  const suppliedDomain = typeof domainValue === "string" ? domainValue : "";

  if (
    name.length < 1
    || name.length > 160
    || slug.length < 1
    || slug.length > 80
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  ) {
    return redirectWithError(request, "invalid_workspace");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/login?from=/onboarding", request.url), 303);
  }

  const email = normalizeEmail(userData.user.email ?? "");
  if (!email) return redirectWithError(request, "invalid_workspace");
  const resolved = resolveOrganizationDomain(email, suppliedDomain);
  if (!resolved.domain) return redirectWithError(request, "invalid_workspace");

  if (!hasFounderAccess(email)) {
    const admin = createSupabaseAdminClient();
    const { data: requestRecord } = await admin
      .from("trial_requests")
      .select("status, organization_domain")
      .eq("normalized_email", email)
      .maybeSingle();

    if (
      !requestRecord
      || !["requested", "approved"].includes(requestRecord.status)
      || requestRecord.organization_domain !== resolved.domain
    ) return redirectWithError(request, "trial_required");
  }

  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_slug: slug,
    workspace_domain: resolved.domain,
  });
  if (error) {
    return redirectWithError(
      request,
      error.message.includes("trial already claimed") ? "trial_claimed" : "unavailable",
    );
  }

  return NextResponse.redirect(new URL("/today", request.url), 303);
}
