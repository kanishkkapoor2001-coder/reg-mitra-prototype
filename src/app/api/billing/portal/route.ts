import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/billing/stripe";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const workspace = await getCurrentWorkspace();
  if (!workspace || !["owner", "admin"].includes(workspace.role)) {
    return NextResponse.json({ error: "Workspace owner access required." }, { status: 403 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("workspace_id", workspace.id)
      .single();
    if (!subscription?.provider_customer_id) throw new Error("Customer not configured.");
    const session = await getStripe().billingPortal.sessions.create({
      customer: subscription.provider_customer_id,
      return_url: `${getAppUrl(request.url)}/billing`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch {
    return NextResponse.redirect(new URL("/billing?error=not_configured", request.url), 303);
  }
}
