import { NextResponse } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithError(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/onboarding?error=${error}`, request.url), 303);
}

export async function POST(request: Request) {
  if (!getSupabasePublicConfig()) return redirectWithError(request, "not_configured");

  const formData = await request.formData();
  const nameValue = formData.get("name");
  const slugValue = formData.get("slug");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const slug = typeof slugValue === "string" ? slugValue.trim().toLowerCase() : "";

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

  const { error } = await supabase.rpc("create_workspace", {
    workspace_name: name,
    workspace_slug: slug,
  });
  if (error) return redirectWithError(request, "unavailable");

  return NextResponse.redirect(new URL("/today", request.url), 303);
}
