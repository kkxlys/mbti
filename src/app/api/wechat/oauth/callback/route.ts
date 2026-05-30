import { NextRequest, NextResponse } from "next/server";
import {
  createWechatOpenidCookieValue,
  exchangeWechatOAuthCode,
  getPublicOrigin,
  getWechatOpenidCookieOptions,
  getWechatStateCookieOptions,
  readWechatStateCookie,
  WECHAT_OAUTH_STATE_COOKIE_NAME,
  WECHAT_OPENID_COOKIE_NAME,
  WechatOAuthApiError,
  WechatOAuthConfigError
} from "../../../../../lib/wechat-oauth";

export const runtime = "nodejs";

function redirectWithResult(request: NextRequest, returnTo: string, result: "ok" | "error", error?: string) {
  const redirectUrl = new URL(returnTo, getPublicOrigin(request));
  redirectUrl.searchParams.set("wechat_oauth", result);
  if (error) redirectUrl.searchParams.set("wechat_oauth_error", error);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set(WECHAT_OAUTH_STATE_COOKIE_NAME, "", {
    ...getWechatStateCookieOptions(),
    maxAge: 0
  });
  return response;
}

export async function GET(request: NextRequest) {
  const stateCookie = readWechatStateCookie(request.cookies.get(WECHAT_OAUTH_STATE_COOKIE_NAME)?.value);
  const fallbackReturnTo = stateCookie?.returnTo ?? "/";

  if (!stateCookie || request.nextUrl.searchParams.get("state") !== stateCookie.state) {
    return redirectWithResult(request, fallbackReturnTo, "error", "state_invalid");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return redirectWithResult(request, fallbackReturnTo, "error", "code_missing");
  }

  try {
    const openid = await exchangeWechatOAuthCode(code);
    const response = redirectWithResult(request, stateCookie.returnTo, "ok");
    response.cookies.set(WECHAT_OPENID_COOKIE_NAME, createWechatOpenidCookieValue(openid), getWechatOpenidCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof WechatOAuthConfigError) {
      return redirectWithResult(request, stateCookie.returnTo, "error", "not_configured");
    }
    if (error instanceof WechatOAuthApiError) {
      return redirectWithResult(request, stateCookie.returnTo, "error", error.code || "api_failed");
    }
    console.error("[wechat-oauth:callback]", error);
    return redirectWithResult(request, stateCookie.returnTo, "error", "unknown");
  }
}
