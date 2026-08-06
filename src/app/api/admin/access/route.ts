import { NextResponse } from "next/server";
import { decideAccess } from "@/lib/access/approve";
import { hasFounderAccess } from "@/lib/billing/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Operator-only. Gated on FOUNDER_ACCESS_EMAILS rather than on being signed in,
// because approving customers is not something an ordinary member should reach
// even if they somehow guess the URL.

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email;

  if (!email || !hasFounderAccess(email)) {
    return new Response("Not found", { status: 404 });
  }

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!requestId || (decision !== "approved" && decision !== "rejected")) {
    return NextResponse.redirect(new URL("/admin/access?error=1", request.url), 303);
  }

  const result = await decideAccess(requestId, decision, email);
  const query = result.ok ? `done=${decision}` : "error=1";
  return NextResponse.redirect(new URL(`/admin/access?${query}`, request.url), 303);
}
