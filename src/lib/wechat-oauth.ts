import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const WECHAT_OAUTH_AUTHORIZE_URL = "https://open.weixin.qq.com/connect/oauth2/authorize";
const WECHAT_OAUTH_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token";
const OPENID_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const STATE_COOKIE_MAX_AGE = 60 * 10;

export const WECHAT_OPENID_COOKIE_NAME = "wechat_openid";
export const WECHAT_OAUTH_STATE_COOKIE_NAME = "wechat_oauth_state";

type WechatOAuthConfig = {
  appId: string;
  appSecret: string;
};

type WechatOAuthTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  openid?: string;
  scope?: string;
  errcode?: number;
  errmsg?: string;
};

type OpenidCookiePayload = {
  openid: string;
  iat: number;
};

type StateCookiePayload = {
  state: string;
  returnTo: string;
  iat: number;
};

export class WechatOAuthConfigError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super(`Missing WeChat OAuth config: ${missing.join(", ")}`);
    this.name = "WechatOAuthConfigError";
    this.missing = missing;
  }
}

export class WechatOAuthApiError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "WechatOAuthApiError";
    this.code = code;
  }
}

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value !== "..." ? value : "";
}

function getCookieSigningSecret() {
  return getEnv("WECHAT_OAUTH_SESSION_SECRET") || getEnv("ADMIN_SESSION_SECRET");
}

function getWechatOAuthConfig(): WechatOAuthConfig {
  const status = getWechatOAuthConfigStatus();
  if (!status.configured) throw new WechatOAuthConfigError(status.missing);

  return {
    appId: getEnv("WECHAT_MP_APPID") || getEnv("WECHAT_PAY_APPID"),
    appSecret: getEnv("WECHAT_MP_APP_SECRET")
  };
}

export function getWechatOAuthConfigStatus() {
  const missing: string[] = [];
  if (!getEnv("WECHAT_MP_APPID") && !getEnv("WECHAT_PAY_APPID")) {
    missing.push("WECHAT_MP_APPID or WECHAT_PAY_APPID");
  }
  if (!getEnv("WECHAT_MP_APP_SECRET")) missing.push("WECHAT_MP_APP_SECRET");
  if (!getCookieSigningSecret()) missing.push("WECHAT_OAUTH_SESSION_SECRET or ADMIN_SESSION_SECRET");

  return {
    configured: missing.length === 0,
    missing
  };
}

export function getWechatCookieSecure() {
  const explicit = getEnv("WECHAT_OAUTH_COOKIE_SECURE");
  if (explicit) return explicit !== "false";
  return process.env.NODE_ENV === "production";
}

export function getWechatOpenidCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getWechatCookieSecure(),
    path: "/",
    maxAge: OPENID_COOKIE_MAX_AGE
  };
}

export function getWechatStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getWechatCookieSecure(),
    path: "/api/wechat/oauth",
    maxAge: STATE_COOKIE_MAX_AGE
  };
}

function sign(encodedPayload: string) {
  const secret = getCookieSigningSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(encodedPayload).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function createSignedValue(payload: unknown) {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function readSignedValue<T>(value?: string) {
  if (!value) return null;
  const [encodedPayload, signature] = value.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = sign(encodedPayload);
  if (!expected || !safeEqual(signature, expected)) return null;

  try {
    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function isFresh(iat: number, maxAgeSeconds: number) {
  return Number.isFinite(iat) && Date.now() - iat <= maxAgeSeconds * 1000;
}

export function createWechatOpenidCookieValue(openid: string) {
  return createSignedValue({
    openid,
    iat: Date.now()
  } satisfies OpenidCookiePayload);
}

export function readWechatOpenidCookie(value?: string) {
  const payload = readSignedValue<OpenidCookiePayload>(value);
  if (!payload?.openid || !isFresh(payload.iat, OPENID_COOKIE_MAX_AGE)) return "";
  return payload.openid;
}

export function createWechatStateCookieValue(returnTo: string) {
  return createSignedValue({
    state: randomBytes(16).toString("hex"),
    returnTo: sanitizeReturnTo(returnTo),
    iat: Date.now()
  } satisfies StateCookiePayload);
}

export function readWechatStateCookie(value?: string) {
  const payload = readSignedValue<StateCookiePayload>(value);
  if (!payload?.state || !isFresh(payload.iat, STATE_COOKIE_MAX_AGE)) return null;
  return payload;
}

export function sanitizeReturnTo(value?: string | null) {
  const fallback = "/";
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  try {
    const url = new URL(trimmed, "https://soul-major.cn");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getPublicOrigin(request: Request) {
  const configured = getEnv("WECHAT_SITE_URL") || getEnv("NEXT_PUBLIC_SITE_URL");
  if (configured) return configured.replace(/\/+$/, "");

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function buildWechatOAuthUrl(request: Request, state: string) {
  const config = getWechatOAuthConfig();
  const origin = getPublicOrigin(request);
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: `${origin}/api/wechat/oauth/callback`,
    response_type: "code",
    scope: "snsapi_base",
    state
  });

  return `${WECHAT_OAUTH_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
}

export async function exchangeWechatOAuthCode(code: string) {
  const config = getWechatOAuthConfig();
  const params = new URLSearchParams({
    appid: config.appId,
    secret: config.appSecret,
    code,
    grant_type: "authorization_code"
  });

  const response = await fetch(`${WECHAT_OAUTH_TOKEN_URL}?${params.toString()}`, {
    cache: "no-store"
  });
  const payload = (await response.json()) as WechatOAuthTokenResponse;

  if (!response.ok || payload.errcode) {
    throw new WechatOAuthApiError(payload.errmsg || "微信网页授权失败", String(payload.errcode || response.status));
  }
  if (!payload.openid) {
    throw new WechatOAuthApiError("微信网页授权未返回 openid", "OPENID_MISSING");
  }

  return payload.openid;
}
