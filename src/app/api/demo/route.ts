import { NextResponse, type NextRequest } from "next/server";

// Enters the frozen demo.
//
// The product itself is behind a login. This is the one deliberate way to see
// it without an account: a fixed, fictional walkthrough that never calls the
// language model and never touches real data.
//
// It exists as an explicit entry rather than a fallback because the two must
// not be confusable. A visitor should never be unsure whether they are looking
// at the product or a sample of it.

const DEMO_MAX_AGE = 60 * 60 * 4; // Long enough for a sales call, short enough to expire.

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/today", request.url));
  response.cookies.set("reg_mitra_session", "demo", {
    maxAge: DEMO_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return response;
}

/** Leaves the demo. */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set("reg_mitra_session", "", { maxAge: 0, path: "/" });
  return response;
}
