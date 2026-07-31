import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function productStatus(status: Stripe.Subscription.Status) {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid" || status === "paused") return "past_due";
  if (status === "canceled") return "canceled";
  return "expired";
}

async function applySubscription(subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata.workspace_id;
  if (!workspaceId) throw new Error("Stripe subscription is missing workspace_id metadata.");
  const periodEnd = subscription.items.data
    .map((item) => item.current_period_end)
    .sort((left, right) => right - left)[0];
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      provider_customer_id: typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
      provider_subscription_id: subscription.id,
      status: productStatus(subscription.status),
      current_period_ends_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);
  if (error) throw error;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("billing_events")
    .select("status")
    .eq("provider_event_id", event.id)
    .maybeSingle();
  if (existing?.status === "processed") return NextResponse.json({ received: true });
  await admin.from("billing_events").upsert({
    provider_event_id: event.id,
    event_type: event.type,
    status: "processing",
    error_message: null,
    processed_at: null,
  });

  try {
    if (
      event.type === "customer.subscription.created"
      || event.type === "customer.subscription.updated"
      || event.type === "customer.subscription.deleted"
    ) {
      await applySubscription(event.data.object);
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        await applySubscription(await getStripe().subscriptions.retrieve(session.subscription));
      }
    }
    await admin
      .from("billing_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("provider_event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin
      .from("billing_events")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown webhook error",
      })
      .eq("provider_event_id", event.id);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
