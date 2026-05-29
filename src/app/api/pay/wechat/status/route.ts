import { NextResponse } from "next/server";
import { getOrder, markOrderPaid } from "../../../../../lib/orders";
import { markUserPaid } from "../../../../../lib/users";
import { queryWechatOrderByOutTradeNo, WechatPayApiError, WechatPayConfigError } from "../../../../../lib/wechat-pay";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "ORDER_ID_REQUIRED", message: "缺少订单号" }, { status: 400 });
  }

  const localOrder = getOrder(orderId);
  if (localOrder?.status === "paid") {
    return NextResponse.json({
      orderId,
      status: "paid",
      transactionId: localOrder.transactionId
    });
  }

  try {
    const transaction = await queryWechatOrderByOutTradeNo(orderId);
    if (transaction.trade_state === "SUCCESS") {
      const paidOrder = markOrderPaid({
        outTradeNo: orderId,
        transactionId: transaction.transaction_id
      });
      markUserPaid(transaction.payer?.openid ?? localOrder?.openid);
      return NextResponse.json({
        orderId,
        status: paidOrder.status,
        tradeState: transaction.trade_state,
        transactionId: paidOrder.transactionId
      });
    }

    return NextResponse.json({
      orderId,
      status: localOrder?.status ?? "pending",
      tradeState: transaction.trade_state,
      tradeStateDesc: transaction.trade_state_desc
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
          orderId,
          status: localOrder?.status ?? "pending",
          error: error.code ?? "WECHAT_PAY_QUERY_FAILED",
          message: error.message
        },
        { status: error.status >= 400 && error.status < 600 ? error.status : 502 }
      );
    }

    console.error("[wechat-pay:status]", error);
    return NextResponse.json({ error: "PAYMENT_STATUS_FAILED", message: "查询支付状态失败" }, { status: 500 });
  }
}
