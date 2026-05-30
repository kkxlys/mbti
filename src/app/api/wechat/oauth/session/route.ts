import { NextRequest, NextResponse } from "next/server";
import {
  getWechatOAuthConfigStatus,
  readWechatOpenidCookie,
  WECHAT_OPENID_COOKIE_NAME
} from "../../../../../lib/wechat-oauth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const openid = readWechatOpenidCookie(request.cookies.get(WECHAT_OPENID_COOKIE_NAME)?.value);
  const status = getWechatOAuthConfigStatus();

  return NextResponse.json({
    hasOpenid: Boolean(openid),
    oauthConfigured: status.configured,
    missing: status.configured ? [] : status.missing
  });
}
