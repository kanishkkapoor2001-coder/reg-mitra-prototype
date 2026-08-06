import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { importRules } from "@/lib/radar/import-rules";
import { matchAllWorkspaces } from "@/lib/radar/match";

// Pulls newly verified applicability rules from the newsletter.
//
// Scheduled to run after the newsletter's own ingest days (Mon/Wed/Fri), so the
// product is matching against the same rule set the digest was built from.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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

  const result = await importRules();

  if (!result.ok) {
    console.error("[cron/rule-import]", result.message);
    return NextResponse.json(result, { status: 502 });
  }

  if (result.skipped.length) {
    console.warn("[cron/rule-import] skipped rules", result.skipped);
  }

  // New rules are worthless until they have been matched against the book, so
  // the two always run together rather than leaving a gap where the product
  // holds a rule it has not applied.
  let match = null;
  if (result.imported > 0) {
    try {
      match = await matchAllWorkspaces();
    } catch (error) {
      console.error("[cron/rule-import] matching failed", error);
    }
  }

  return NextResponse.json({ ...result, match });
}
