import { createDecipheriv, createSign, createVerify, randomBytes } from "crypto";
import { readFileSync } from "fs";

const WECHAT_PAY_BASE_URL = "https://api.mch.weixin.qq.com";
const DEFAULT_PRICE_CENTS = 990;

export type WechatPayConfig = {
  appId: string;
  mchId: string;
  apiV3Key: string;
  merchantSerialNo: string;
  privateKey: string;
  notifyUrl: string;
  verifyKeys: Record<string, string>;
};

export type JsapiBridgeParams = {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: "RSA";
  paySign: string;
};

type WechatPrepayBase = {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  notify_url: string;
  amount: {
    total: number;
    currency: "CNY";
  };
};

type WechatJsapiPrepayResponse = {
  prepay_id: string;
};

type WechatNativePrepayResponse = {
  code_url: string;
};

export type WechatTransaction = {
  appid?: string;
  mchid?: string;
  out_trade_no: string;
  transaction_id?: string;
  trade_state: string;
  trade_state_desc?: string;
  payer?: {
    openid?: string;
  };
};

type WechatEncryptedResource = {
  algorithm: string;
  ciphertext: string;
  associated_data?: string;
  nonce: string;
  original_type?: string;
};

export class WechatPayConfigError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super(`Missing WeChat Pay config: ${missing.join(", ")}`);
    this.name = "WechatPayConfigError";
    this.missing = missing;
  }
}

export class WechatPayApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "WechatPayApiError";
    this.status = status;
    this.code = code;
  }
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

function getEnv(name: string) {
  const value = process.env[name]?.trim();
  return value && value !== "..." ? value : "";
}

function getPrivateKey() {
  const inlineKey = getEnv("WECHAT_PAY_PRIVATE_KEY");
  if (inlineKey) return normalizePem(inlineKey);

  const keyPath = getEnv("WECHAT_PAY_PRIVATE_KEY_PATH");
  if (!keyPath) return "";
  try {
    return readFileSync(keyPath, "utf8").trim();
  } catch {
    return "";
  }
}

function getVerifyKeys() {
  const verifyKeys: Record<string, string> = {};
  const publicKeyId = getEnv("WECHAT_PAY_PUBLIC_KEY_ID");
  const publicKeyPath = getEnv("WECHAT_PAY_PUBLIC_KEY_PATH");
  let publicKey = getEnv("WECHAT_PAY_PUBLIC_KEY");

  if (!publicKey && publicKeyPath) {
    try {
      publicKey = readFileSync(publicKeyPath, "utf8");
    } catch {
      publicKey = "";
    }
  }

  if (publicKeyId && publicKey) {
    verifyKeys[publicKeyId] = normalizePem(publicKey);
  }

  const rawJson = getEnv("WECHAT_PAY_VERIFY_KEYS_JSON");
  if (!rawJson) return verifyKeys;

  try {
    const parsed = JSON.parse(rawJson) as Record<string, string>;
    Object.entries(parsed).forEach(([serial, pem]) => {
      if (serial && pem) verifyKeys[serial] = normalizePem(pem);
    });
  } catch {
    throw new WechatPayConfigError(["WECHAT_PAY_VERIFY_KEYS_JSON"]);
  }

  return verifyKeys;
}

export function getWechatPayConfigStatus() {
  const missing: string[] = [];
  if (!getEnv("WECHAT_PAY_APPID")) missing.push("WECHAT_PAY_APPID");
  if (!getEnv("WECHAT_PAY_MCHID")) missing.push("WECHAT_PAY_MCHID");
  if (!getEnv("WECHAT_PAY_API_V3_KEY")) missing.push("WECHAT_PAY_API_V3_KEY");
  if (!getEnv("WECHAT_PAY_MERCHANT_SERIAL_NO")) missing.push("WECHAT_PAY_MERCHANT_SERIAL_NO");
  if (!getPrivateKey()) missing.push("WECHAT_PAY_PRIVATE_KEY or WECHAT_PAY_PRIVATE_KEY_PATH");
  if (!getEnv("WECHAT_PAY_NOTIFY_URL")) missing.push("WECHAT_PAY_NOTIFY_URL");
  if (Object.keys(getVerifyKeys()).length === 0) {
    missing.push("WECHAT_PAY_PUBLIC_KEY_ID/WECHAT_PAY_PUBLIC_KEY or WECHAT_PAY_PUBLIC_KEY_PATH or WECHAT_PAY_VERIFY_KEYS_JSON");
  }

  return {
    configured: missing.length === 0,
    missing
  };
}

export function getWechatPayConfig(): WechatPayConfig {
  const status = getWechatPayConfigStatus();
  if (!status.configured) throw new WechatPayConfigError(status.missing);

  return {
    appId: getEnv("WECHAT_PAY_APPID"),
    mchId: getEnv("WECHAT_PAY_MCHID"),
    apiV3Key: getEnv("WECHAT_PAY_API_V3_KEY"),
    merchantSerialNo: getEnv("WECHAT_PAY_MERCHANT_SERIAL_NO"),
    privateKey: getPrivateKey(),
    notifyUrl: getEnv("WECHAT_PAY_NOTIFY_URL"),
    verifyKeys: getVerifyKeys()
  };
}

export function getReportPriceCents() {
  const rawValue = getEnv("WECHAT_PAY_REPORT_PRICE_CENTS");
  const parsed = Number.parseInt(rawValue || `${DEFAULT_PRICE_CENTS}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PRICE_CENTS;
}

function createNonce() {
  return randomBytes(16).toString("hex");
}

function signWithPrivateKey(message: string, privateKey: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(message, "utf8");
  signer.end();
  return signer.sign(privateKey, "base64");
}

function buildAuthorization(config: WechatPayConfig, method: string, urlPath: string, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = createNonce();
  const message = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = signWithPrivateKey(message, config.privateKey);

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${config.merchantSerialNo}",signature="${signature}"`;
}

function verifySignature(config: WechatPayConfig, serial: string, message: string, signature: string) {
  const publicKey = config.verifyKeys[serial];
  if (!publicKey) return false;

  const verifier = createVerify("RSA-SHA256");
  verifier.update(message, "utf8");
  verifier.end();
  return verifier.verify(publicKey, Buffer.from(signature, "base64"));
}

function verifyWechatHeaders(config: WechatPayConfig, headers: Headers, body: string) {
  const timestamp = headers.get("wechatpay-timestamp") ?? "";
  const nonce = headers.get("wechatpay-nonce") ?? "";
  const signature = headers.get("wechatpay-signature") ?? "";
  const serial = headers.get("wechatpay-serial") ?? "";
  if (!timestamp || !nonce || !signature || !serial) return false;

  const timestampNumber = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampNumber) || Math.abs(Date.now() / 1000 - timestampNumber) > 300) {
    return false;
  }

  const message = `${timestamp}\n${nonce}\n${body}\n`;
  return verifySignature(config, serial, message, signature);
}

async function wechatPayRequest<T>(method: "GET" | "POST", pathWithQuery: string, payload?: unknown) {
  const config = getWechatPayConfig();
  const body = payload ? JSON.stringify(payload) : "";
  const response = await fetch(`${WECHAT_PAY_BASE_URL}${pathWithQuery}`, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: buildAuthorization(config, method, pathWithQuery, body),
      "Content-Type": "application/json"
    },
    body: body || undefined,
    cache: "no-store"
  });
  const responseBody = await response.text();
  const parsed = responseBody ? JSON.parse(responseBody) : {};

  if (!response.ok) {
    const error = parsed as { code?: string; message?: string };
    throw new WechatPayApiError(response.status, error.message ?? "微信支付接口请求失败", error.code);
  }

  if (!verifyWechatHeaders(config, response.headers, responseBody)) {
    throw new WechatPayApiError(response.status, "微信支付应答验签失败", "VERIFY_FAILED");
  }

  return parsed as T;
}

export async function createWechatPrepay(input: {
  mode: "jsapi" | "native";
  outTradeNo: string;
  amountCents: number;
  description: string;
  payerOpenid?: string;
}) {
  const config = getWechatPayConfig();
  const payload: WechatPrepayBase & { payer?: { openid: string } } = {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description,
    out_trade_no: input.outTradeNo,
    notify_url: config.notifyUrl,
    amount: {
      total: input.amountCents,
      currency: "CNY"
    }
  };

  if (input.mode === "jsapi") {
    if (!input.payerOpenid) {
      throw new WechatPayApiError(400, "JSAPI 支付需要 openid", "OPENID_REQUIRED");
    }
    payload.payer = { openid: input.payerOpenid };
    const result = await wechatPayRequest<WechatJsapiPrepayResponse>(
      "POST",
      "/v3/pay/transactions/jsapi",
      payload
    );
    return {
      prepayId: result.prepay_id,
      jsapiParams: buildJsapiBridgeParams(result.prepay_id)
    };
  }

  const result = await wechatPayRequest<WechatNativePrepayResponse>(
    "POST",
    "/v3/pay/transactions/native",
    payload
  );
  return {
    codeUrl: result.code_url
  };
}

export function buildJsapiBridgeParams(prepayId: string): JsapiBridgeParams {
  const config = getWechatPayConfig();
  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = createNonce();
  const packageValue = `prepay_id=${prepayId}`;
  const message = `${config.appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`;

  return {
    appId: config.appId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: "RSA",
    paySign: signWithPrivateKey(message, config.privateKey)
  };
}

export async function queryWechatOrderByOutTradeNo(outTradeNo: string) {
  const config = getWechatPayConfig();
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${config.mchId}`;
  return wechatPayRequest<WechatTransaction>("GET", path);
}

export function verifyWechatNotification(headers: Headers, rawBody: string) {
  const config = getWechatPayConfig();
  return verifyWechatHeaders(config, headers, rawBody);
}

export function decryptWechatResource(resource: WechatEncryptedResource) {
  const config = getWechatPayConfig();
  if (resource.algorithm !== "AEAD_AES_256_GCM") {
    throw new Error(`Unsupported WeChat Pay resource algorithm: ${resource.algorithm}`);
  }

  const key = Buffer.from(config.apiV3Key, "utf8");
  if (key.length !== 32) {
    throw new WechatPayConfigError(["WECHAT_PAY_API_V3_KEY must be 32 bytes"]);
  }

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(resource.nonce, "utf8"));
  if (resource.associated_data) {
    decipher.setAAD(Buffer.from(resource.associated_data, "utf8"));
  }
  const encrypted = Buffer.from(resource.ciphertext, "base64");
  if (encrypted.length <= 16) {
    throw new Error("Invalid WeChat Pay encrypted resource");
  }

  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const authTag = encrypted.subarray(encrypted.length - 16);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
