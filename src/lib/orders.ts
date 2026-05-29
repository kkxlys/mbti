export type OrderStatus = "pending" | "paid" | "closed";
export type PaymentMode = "jsapi" | "native";

export type PaymentOrder = {
  outTradeNo: string;
  amountCents: number;
  mode: PaymentMode;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  transactionId?: string;
  openid?: string;
  resultType?: string;
  score?: number;
  gender?: string;
};

const globalForOrders = globalThis as typeof globalThis & {
  __mbtiPaymentOrders?: Map<string, PaymentOrder>;
};

// Replace this with a persistent database before production traffic.
const orders = globalForOrders.__mbtiPaymentOrders ?? new Map<string, PaymentOrder>();
globalForOrders.__mbtiPaymentOrders = orders;

export function createOrder(input: {
  outTradeNo: string;
  amountCents: number;
  mode: PaymentMode;
  openid?: string;
  resultType?: string;
  score?: number;
  gender?: string;
}) {
  const order: PaymentOrder = {
    ...input,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  orders.set(order.outTradeNo, order);
  return order;
}

export function getOrder(outTradeNo: string) {
  return orders.get(outTradeNo) ?? null;
}

export function listOrders() {
  return Array.from(orders.values()).sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

export function markOrderPaid(input: { outTradeNo: string; transactionId?: string }) {
  const current = orders.get(input.outTradeNo);
  const next: PaymentOrder = {
    ...(current ?? {
      outTradeNo: input.outTradeNo,
      amountCents: 0,
      mode: "native",
      status: "pending",
      createdAt: new Date().toISOString()
    }),
    status: "paid",
    paidAt: new Date().toISOString(),
    transactionId: input.transactionId
  };
  orders.set(input.outTradeNo, next);
  return next;
}
