import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { matchAllWorkspaces } from "@/lib/radar/match";

// Nightly safety net.
//
// Matching normally runs the moment something changes — a rule import, or a CA
// answering a profile question. This catches whatever those paths missed: a
// fact that expired overnight (which can turn a flagged match back into
// "needs facts"), or a match that failed mid-run.

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

  try {
    const result = await matchAllWorkspaces();
    if (result.totals.errors.length) {
      console.warn("[cron/rematch] errors", result.totals.errors.slice(0, 20));
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[cron/rematch] failed", error);
    return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}
