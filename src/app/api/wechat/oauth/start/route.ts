import { NextRequest, NextResponse } from "next/server";
import {
  buildWechatOAuthUrl,
  createWechatStateCookieValue,
  getPublicOrigin,
  getWechatOAuthConfigStatus,
  getWechatStateCookieOptions,
  readWechatStateCookie,
  sanitizeReturnTo,
  WECHAT_OAUTH_STATE_COOKIE_NAME,
  WechatOAuthConfigError
} from "../../../../../lib/wechat-oauth";

export const runtime = "nodejs";

function redirectBack(request: NextRequest, returnTo: string, error: string) {
  const redirectUrl = new URL(returnTo, getPublicOrigin(request));
  redirectUrl.searchParams.set("wechat_oauth", "error");
  redirectUrl.searchParams.set("wechat_oauth_error", error);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const status = getWechatOAuthConfigStatus();
  if (!status.configured) {
    return redirectBack(request, returnTo, "not_configured");
  }

  const stateCookieValue = createWechatStateCookieValue(returnTo);
  const stateCookie = readWechatStateCookie(stateCookieValue);

  if (!stateCookie) {
    return redirectBack(request, returnTo, "state_failed");
  }

  try {
    const response = NextResponse.redirect(buildWechatOAuthUrl(request, stateCookie.state));
    response.cookies.set(WECHAT_OAUTH_STATE_COOKIE_NAME, stateCookieValue, getWechatStateCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof WechatOAuthConfigError) {
      return redirectBack(request, returnTo, "not_configured");
    }
    throw error;
  }
}
