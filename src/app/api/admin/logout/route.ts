import { NextResponse } from "next/server";
import { clearAdminCookie, isSameOriginRequest } from "../../../../lib/admin-auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.redirect(new URL("/admin/login?error=origin", request.url), { status: 303 });
  }

  const response = NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
  const cookie = clearAdminCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
