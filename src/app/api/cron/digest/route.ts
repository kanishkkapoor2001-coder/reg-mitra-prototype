import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendPendingDigests } from "@/lib/radar/digest";

// Weekly digest of matches waiting on a decision. Runs after the week's first
// rule import, so the email reflects the newest circulars.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorized(header: string | null, secret: string): boolean {
  if (!header) return false;
  const supplied = Buffer.from(header);
  const expected = Buffer.from(`Bearer ${secret}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authorized(request.headers.get("authorization"), secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendPendingDigests();
  if (result.errors.length) console.warn("[cron/digest]", result.errors.slice(0, 10));
  return NextResponse.json(result);
}
