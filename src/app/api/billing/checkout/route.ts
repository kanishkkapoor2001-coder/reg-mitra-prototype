import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, requireStripePriceId } from "@/lib/billing/stripe";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  const [workspace, supabase] = await Promise.all([
    getCurrentWorkspace(),
    createSupabaseServerClient(),
  ]);
  const { data: userData } = await supabase.auth.getUser();
  if (!workspace || !userData.user || !["owner", "admin"].includes(workspace.role)) {
    return NextResponse.json({ error: "Workspace owner access required." }, { status: 403 });
  }

  try {
    const admin = createSupabaseAdminClient();
    const stripe = getStripe();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("workspace_id", workspace.id)
      .single();
    let customerId = subscription?.provider_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        name: workspace.name,
        metadata: { workspace_id: workspace.id },
      });
      customerId = customer.id;
      await admin
        .from("subscriptions")
        .update({ provider_customer_id: customerId, updated_at: new Date().toISOString() })
        .eq("workspace_id", workspace.id);
    }

    const appUrl = getAppUrl(request.url);
    const checkout = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: requireStripePriceId(), quantity: 1 }],
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      client_reference_id: workspace.id,
      metadata: { workspace_id: workspace.id },
      subscription_data: { metadata: { workspace_id: workspace.id } },
      allow_promotion_codes: true,
    });
    if (!checkout.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.redirect(checkout.url, 303);
  } catch {
    return NextResponse.redirect(new URL("/billing?error=not_configured", request.url), 303);
  }
}
