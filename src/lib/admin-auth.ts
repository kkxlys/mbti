import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "soul_major_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
const PASSWORD_HASH_PREFIX = "pbkdf2_sha256";
const MIN_USERNAME_LENGTH = 4;
const MIN_SESSION_SECRET_LENGTH = 32;

type AdminSessionPayload = {
  sub: "admin";
  iat: number;
  exp: number;
  nonce: string;
};

type LoginAttempt = {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number;
};

const globalForAdminAuth = globalThis as typeof globalThis & {
  __mbtiAdminLoginAttempts?: Map<string, LoginAttempt>;
};

const loginAttempts = globalForAdminAuth.__mbtiAdminLoginAttempts ?? new Map<string, LoginAttempt>();
globalForAdminAuth.__mbtiAdminLoginAttempts = loginAttempts;

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? "";
}

function getAdminPasswordHash() {
  return process.env.ADMIN_PASSWORD_HASH?.trim() ?? "";
}

function getAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim() ?? "";
}

function sign(value: string) {
  return createHmac("sha256", getAdminSessionSecret()).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function shouldUseSecureAdminCookie() {
  if (process.env.ADMIN_COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function normalizeOrigin(value?: string | null) {
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getConfiguredAdminOrigin() {
  return (
    normalizeOrigin(process.env.ADMIN_SITE_URL) ||
    normalizeOrigin(process.env.WECHAT_SITE_URL) ||
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  );
}

export function getAdminPublicOrigin(request: Request) {
  const configured = getConfiguredAdminOrigin();
  if (configured) return configured;

  const requestUrl = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function isAdminAuthConfigured() {
  const missing: string[] = [];
  if (getAdminUsername().length < MIN_USERNAME_LENGTH) missing.push("ADMIN_USERNAME");
  if (!getAdminPasswordHash()) missing.push("ADMIN_PASSWORD_HASH");
  if (getAdminSessionSecret().length < MIN_SESSION_SECRET_LENGTH) missing.push("ADMIN_SESSION_SECRET");
  return {
    configured: missing.length === 0,
    missing
  };
}

export function hashAdminPassword(password: string, salt = randomBytes(16).toString("base64url")) {
  const iterations = 600000;
  const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `${PASSWORD_HASH_PREFIX}:${iterations}:${salt}:${derived}`;
}

export function verifyAdminUsername(username: string) {
  const configured = isAdminAuthConfigured();
  if (!configured.configured) return false;
  return safeEqual(username.trim(), getAdminUsername());
}

export function verifyAdminPassword(password: string) {
  const configured = isAdminAuthConfigured();
  if (!configured.configured) return false;

  const rawHash = getAdminPasswordHash();
  const parts = rawHash.includes(":") ? rawHash.split(":") : rawHash.split("$");
  const [prefix, iterationValue, salt, expected] = parts;
  const iterations = Number.parseInt(iterationValue ?? "", 10);
  if (prefix !== PASSWORD_HASH_PREFIX || !Number.isFinite(iterations) || !salt || !expected) return false;

  const derived = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return safeEqual(derived, expected);
}

export function createAdminSessionToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: "admin",
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminSessionToken(token: string | undefined) {
  const configured = isAdminAuthConfigured();
  if (!configured.configured || !token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !safeEqual(sign(encodedPayload), signature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<AdminSessionPayload>;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function createAdminCookie(token: string) {
  return {
    name: ADMIN_COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: shouldUseSecureAdminCookie(),
      sameSite: "strict" as const,
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS
    }
  };
}

export function clearAdminCookie() {
  return {
    name: ADMIN_COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      secure: shouldUseSecureAdminCookie(),
      sameSite: "strict" as const,
      path: "/",
      maxAge: 0
    }
  };
}

export function getClientIp(headers: Headers) {
  const forwardedFor = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || headers.get("x-real-ip")?.trim() || "local";
}

export function checkAdminLoginRateLimit(key: string) {
  const now = Date.now();
  const attempt = loginAttempts.get(key);
  if (!attempt) return { allowed: true, retryAfterSeconds: 0 };
  if (attempt.lockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((attempt.lockedUntil - now) / 1000)
    };
  }
  if (now - attempt.firstAttemptAt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordAdminLoginFailure(key: string) {
  const now = Date.now();
  const current = loginAttempts.get(key);
  const attempt =
    current && now - current.firstAttemptAt <= 15 * 60 * 1000
      ? current
      : { count: 0, firstAttemptAt: now, lockedUntil: 0 };

  attempt.count += 1;
  if (attempt.count >= 5) {
    attempt.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(key, attempt);
}

export function clearAdminLoginFailures(key: string) {
  loginAttempts.delete(key);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  const allowedOrigins = new Set<string>();
  const publicOrigin = normalizeOrigin(getAdminPublicOrigin(request));
  if (publicOrigin) allowedOrigins.add(publicOrigin);

  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  if (requestOrigin && !requestOrigin.includes("0.0.0.0")) {
    allowedOrigins.add(requestOrigin);
  }

  return allowedOrigins.has(normalizedOrigin);
}
