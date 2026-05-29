import { NextResponse } from "next/server";
import {
  checkAdminLoginRateLimit,
  clearAdminLoginFailures,
  createAdminCookie,
  createAdminSessionToken,
  getClientIp,
  isAdminAuthConfigured,
  isSameOriginRequest,
  recordAdminLoginFailure,
  verifyAdminPassword,
  verifyAdminUsername
} from "../../../../lib/admin-auth";

export const runtime = "nodejs";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  if (!isSameOriginRequest(request)) {
    return redirectTo(request, "/admin/login?error=origin");
  }

  const config = isAdminAuthConfigured();
  if (!config.configured) {
    return redirectTo(request, "/admin/login?error=config");
  }

  const limit = checkAdminLoginRateLimit(ip);
  if (!limit.allowed) {
    const response = redirectTo(request, "/admin/login?error=locked");
    response.headers.set("Retry-After", `${limit.retryAfterSeconds}`);
    return response;
  }

  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");

  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    !verifyAdminUsername(username) ||
    !verifyAdminPassword(password)
  ) {
    recordAdminLoginFailure(ip);
    return redirectTo(request, "/admin/login?error=invalid");
  }

  clearAdminLoginFailures(ip);
  const response = redirectTo(request, "/admin");
  const cookie = createAdminCookie(createAdminSessionToken());
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
