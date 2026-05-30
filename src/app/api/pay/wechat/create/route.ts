import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createOrder, type PaymentMode } from "../../../../../lib/orders";
import { upsertUserFromOrder } from "../../../../../lib/users";
import { readWechatOpenidCookie, WECHAT_OPENID_COOKIE_NAME } from "../../../../../lib/wechat-oauth";
import {
  createWechatPrepay,
  getReportPriceCents,
  getWechatPayConfigStatus,
  WechatPayApiError,
  WechatPayConfigError
} from "../../../../../lib/wechat-pay";

export const runtime = "nodejs";

type CreatePaymentBody = {
  mode?: PaymentMode;
  openid?: string;
  resultType?: string;
  score?: number;
  gender?: string;
};

function createOutTradeNo() {
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `MBTI${Date.now()}${suffix}`;
}

function normalizeMode(value: unknown): PaymentMode | null {
  return value === "jsapi" || value === "native" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const status = getWechatPayConfigStatus();
    if (!status.configured) {
      return NextResponse.json(
        {
          error: "WECHAT_PAY_NOT_CONFIGURED",
          message: "微信支付参数未配置完整",
          missing: status.missing
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as CreatePaymentBody;
    const mode = normalizeMode(body.mode);
    if (!mode) {
      return NextResponse.json({ error: "INVALID_PAYMENT_MODE", message: "支付方式不正确" }, { status: 400 });
    }

    const requestOpenid = typeof body.openid === "string" ? body.openid.trim() : "";
    const cookieOpenid = readWechatOpenidCookie(request.cookies.get(WECHAT_OPENID_COOKIE_NAME)?.value);
    const openid = mode === "jsapi" ? requestOpenid || cookieOpenid : requestOpenid;

    if (mode === "jsapi" && !openid) {
      return NextResponse.json(
        {
          error: "OPENID_REQUIRED",
          message: "请在微信内完成支付授权"
        },
        { status: 400 }
      );
    }

    const outTradeNo = createOutTradeNo();
    const amountCents = getReportPriceCents();
    const prepay = await createWechatPrepay({
      mode,
      outTradeNo,
      amountCents,
      description: "高考志愿人格报告",
      payerOpenid: openid
    });

    createOrder({
      outTradeNo,
      amountCents,
      mode,
      openid,
      resultType: body.resultType,
      score: body.score,
      gender: body.gender
    });
    upsertUserFromOrder({
      openid,
      resultType: body.resultType,
      score: body.score,
      gender: body.gender
    });

    return NextResponse.json({
      orderId: outTradeNo,
      amountCents,
      mode,
      ...prepay
    });
  } catch (error) {
    if (error instanceof WechatPayConfigError) {
      return NextResponse.json(
        {
          error: "WECHAT_PAY_NOT_CONFIGURED",
          message: "微信支付参数未配置完整",
          missing: error.missing
        },
        { status: 503 }
      );
    }

    if (error instanceof WechatPayApiError) {
      return NextResponse.json(
        {
          error: error.code ?? "WECHAT_PAY_API_ERROR",
          message: error.message
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      );
    }

    console.error("[wechat-pay:create]", error);
    return NextResponse.json({ error: "PAYMENT_CREATE_FAILED", message: "创建微信支付订单失败" }, { status: 500 });
  }
}
