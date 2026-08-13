import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emailDomain,
  normalizeEmail,
  normalizeOrganizationDomain,
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
  const suppliedDomain = typeof domainValue === "string" ? domainValue : "";

  // The address is normalised, not judged. It previously had to arrive already
  // matching ^[a-z0-9-]+$, so "Mehta Shah & Co" or a stray capital was rejected
  // outright — for a field whose only job is to be a URL fragment we can derive
  // ourselves. Falls back to the firm name when left blank.
  const slugify = (value: string) => value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

  const slug = slugify(typeof slugValue === "string" && slugValue.trim() ? slugValue : name);

  if (name.length < 1 || name.length > 160 || slug.length < 1) {
    return redirectWithError(request, "invalid_workspace");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL("/login?from=/onboarding", request.url), 303);
  }

  const email = normalizeEmail(userData.user.email ?? "");
  if (!email) return redirectWithError(request, "invalid_workspace");

  // Whatever domain they give is the one we use.
  //
  // resolveOrganizationDomain rejected any domain that differed from the
  // address they signed up with, so a firm on @gmail could not name its own
  // domain and a founder on a subdomain could not name the parent — the exact
  // case that surfaced this. The domain labels the workspace; it is not a
  // credential, and the account is already authenticated by this point.
  const domain = normalizeOrganizationDomain(suppliedDomain) ?? emailDomain(email);
  if (!domain) return redirectWithError(request, "invalid_workspace");

  // The trial_requests gate is gone. A row there is only ever written by
  // /start, which nothing on the site links to — so every firm arriving through
  // the normal sign-up had no row, failed this check, and was stuck at
  // onboarding permanently with "Request pilot access". Reaching here already
  // means an approved account.

  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_slug: slug,
    workspace_domain: domain,
  });
  if (error) {
    return redirectWithError(
      request,
      error.message.includes("trial already claimed") ? "trial_claimed" : "unavailable",
    );
  }

  return NextResponse.redirect(new URL("/today", request.url), 303);
}
