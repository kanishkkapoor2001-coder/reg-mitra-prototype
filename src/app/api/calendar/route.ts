import { NextResponse } from "next/server";
import { getLiveCalendarSnapshot } from "@/lib/live-calendar";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year") ?? now.getFullYear());
  const monthIndex = Number(searchParams.get("month") ?? now.getMonth());

  if (!Number.isInteger(year) || year < 2024 || year > 2035) {
    return NextResponse.json({ error: "Invalid calendar year." }, { status: 400 });
  }
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return NextResponse.json({ error: "Invalid calendar month." }, { status: 400 });
  }

  const snapshot = await getLiveCalendarSnapshot(year, monthIndex);
  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
