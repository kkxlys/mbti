import { NextResponse } from "next/server";
import { clearAdminCookie, getAdminPublicOrigin, isSameOriginRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.redirect(new URL("/admin/login?error=origin", getAdminPublicOrigin(request)), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/admin/login", getAdminPublicOrigin(request)), { status: 303 });
  const cookie = clearAdminCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
