import { NextResponse } from "next/server";
import { markOrderPaid } from "../../../../../lib/orders";
import { markUserPaid } from "../../../../../lib/users";
import {
  decryptWechatResource,
  verifyWechatNotification,
  type WechatTransaction,
  WechatPayConfigError
} from "../../../../../lib/wechat-pay";

export const runtime = "nodejs";

type WechatPayNotification = {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    associated_data?: string;
    nonce: string;
    original_type?: string;
  };
  summary?: string;
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    if (!verifyWechatNotification(request.headers, rawBody)) {
      return NextResponse.json({ code: "FAIL", message: "签名验证失败" }, { status: 401 });
    }

    const notification = JSON.parse(rawBody) as WechatPayNotification;
    const decrypted = decryptWechatResource(notification.resource);
    const transaction = JSON.parse(decrypted) as WechatTransaction;

    if (transaction.trade_state === "SUCCESS") {
      markOrderPaid({
        outTradeNo: transaction.out_trade_no,
        transactionId: transaction.transaction_id
      });
      markUserPaid(transaction.payer?.openid);
    }

    return NextResponse.json({ code: "SUCCESS", message: "成功" });
  } catch (error) {
    if (error instanceof WechatPayConfigError) {
      console.error("[wechat-pay:notify:config]", error.missing);
      return NextResponse.json({ code: "FAIL", message: "微信支付参数未配置完整" }, { status: 500 });
    }

    console.error("[wechat-pay:notify]", error);
    return NextResponse.json({ code: "FAIL", message: "通知处理失败" }, { status: 500 });
  }
}
