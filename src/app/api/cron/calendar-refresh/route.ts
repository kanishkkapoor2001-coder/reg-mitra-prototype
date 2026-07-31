import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import {
  CALENDAR_SOURCE_CACHE_TAG,
  getLiveCalendarSnapshot,
} from "@/lib/live-calendar";

export const maxDuration = 60;

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  revalidateTag(CALENDAR_SOURCE_CACHE_TAG, { expire: 0 });

  const now = new Date();
  const months = [0, 1, 2].map((offset) => (
    new Date(now.getFullYear(), now.getMonth() + offset, 1)
  ));
  const snapshots = await Promise.all(
    months.map((month) => getLiveCalendarSnapshot(month.getFullYear(), month.getMonth())),
  );

  return NextResponse.json({
    ok: true,
    refreshedAt: snapshots[0]?.checkedAt ?? now.toISOString(),
    monthsPrepared: snapshots.map((snapshot) => ({
      year: snapshot.year,
      month: snapshot.monthIndex + 1,
      events: snapshot.events.length,
      sourceHealth: snapshot.health,
    })),
  });
}
