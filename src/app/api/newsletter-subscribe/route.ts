import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The subscriber list lives in the newsletter app's database, not this one, so
// the write is forwarded server-side. Going through our own origin keeps the
// browser away from cross-origin requests entirely.
const NEWSLETTER_API =
  process.env.NEWSLETTER_APP_URL?.trim().replace(/\/$/, "") ||
  "https://reg-mitra.vercel.app";

function back(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/newsletter?${query}`, request.url), 303);
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return back(request, "error=invalid");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const profession = String(formData.get("profession") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();

  if (!email || !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) {
    return back(request, "error=email");
  }
  if (profession !== "ca" && profession !== "other") {
    return back(request, "error=profession");
  }

  try {
    const response = await fetch(`${NEWSLETTER_API}/api/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Preserve the caller's address so the newsletter app rate-limits the
        // real visitor rather than this server.
        "x-forwarded-for":
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "",
      },
      body: JSON.stringify({ email, profession, company }),
      cache: "no-store",
    });

    if (response.status === 429) return back(request, "error=rate");
    if (!response.ok) return back(request, "error=server");
  } catch {
    return back(request, "error=server");
  }

  return back(request, "subscribed=1");
}
