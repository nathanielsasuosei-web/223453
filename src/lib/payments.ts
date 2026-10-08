import "server-only";
import {
  beatById,
  db,
  licenseById,
  orderById,
  paymentById,
  persist,
  randomCode,
  uid,
  type Beat,
  type License,
  type Order,
  type Payment,
  type PaymentMethod,
  type User,
} from "./store";
import { randomToken } from "./upload";
import {
  notifyAdminNewOrder,
  notifyBeatDelivered,
  notifyOrderCancelled,
  notifyOrderCreated,
  notifyPaymentInstructions,
} from "./notifications";

export interface PaymentMethodInfo {
  id: PaymentMethod;
  label: string;
  blurb: string;
}

export function paymentMethods(): PaymentMethodInfo[] {
  return [
    {
      id: "MOBILE_MONEY",
      label: "Mobile Money",
      blurb: "MTN MoMo, Telecel Cash, AirtelTigo Money, M-Pesa — instant confirmation.",
    },
    {
      id: "BANK",
      label: "Bank Transfer",
      blurb: "Direct transfer to the studio account. Confirmed within the hour.",
    },
  ];
}

export function momoProviders(): string[] {
  const fromSettings = db().settings.momoAccounts.map((a) => a.provider).filter(Boolean);
  const defaults = ["MTN Mobile Money", "Telecel Cash", "AirtelTigo Money", "M-Pesa"];
  return [...new Set([...fromSettings, ...defaults])];
}

/* ------------------------------------------------------------------ orders */

export async function createOrder(user: User, beatId: string, licenseId: string) {
  const beat = beatById(beatId);
  if (!beat || !beat.published) throw new Error("That beat is not available.");
  const license = licenseById(licenseId);
  if (!license || !license.active) throw new Error("That license is not available.");

  const data = db();
  const order: Order = {
    id: uid("ord"),
    code: `BF-${randomCode(6)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    beatId: beat.id,
    licenseId: license.id,
    amountCents: license.priceCents,
    currency: data.settings.currency,
    status: "PENDING",
    method: null,
    reference: randomCode(4),
    note: "",
    createdAt: new Date().toISOString(),
    paidAt: null,
    deliveredAt: null,
  };
  data.orders.unshift(order);
  persist("orders");
  await notifyOrderCreated(order, beat, license);
  return { order, beat, license };
}

export async function submitMobileMoneyPayment(orderId: string, input: { provider: string; phone: string }) {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "PAID" || order.status === "DELIVERED") throw new Error("This order is already paid.");
  if (!input.phone || input.phone.replace(/\D/g, "").length < 9) {
    throw new Error("Enter a valid mobile money phone number.");
  }

  const data = db();
  const payment: Payment = {
    id: uid("pay"),
    orderId: order.id,
    method: "MOBILE_MONEY",
    provider: input.provider,
    phone: input.phone,
    reference: `MM-${order.code}`,
    amountCents: order.amountCents,
    currency: order.currency,
    status: "PENDING",
    proofPath: null,
    note: "",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedBy: null,
  };
  data.payments.unshift(payment);
  order.status = "AWAITING_CONFIRMATION";
  order.method = "MOBILE_MONEY";
  persist("payments", "orders");

  const beat = beatById(order.beatId);
  const license = licenseById(order.licenseId);
  if (beat && license) {
    await notifyPaymentInstructions(order, beat, license, payment);
    await notifyAdminNewOrder(order, beat, payment);
  }
  return payment;
}

export async function submitBankPayment(
  orderId: string,
  input: { reference: string; note: string; proofPath: string | null },
) {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "PAID" || order.status === "DELIVERED") throw new Error("This order is already paid.");

  const data = db();
  const payment: Payment = {
    id: uid("pay"),
    orderId: order.id,
    method: "BANK",
    provider: data.settings.bankAccount.bankName || "Bank transfer",
    phone: "",
    reference: input.reference?.trim() || order.code,
    amountCents: order.amountCents,
    currency: order.currency,
    status: "PENDING",
    proofPath: input.proofPath,
    note: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedBy: null,
  };
  data.payments.unshift(payment);
  order.status = "AWAITING_CONFIRMATION";
  order.method = "BANK";
  persist("payments", "orders");

  const beat = beatById(order.beatId);
  const license = licenseById(order.licenseId);
  if (beat && license) {
    await notifyPaymentInstructions(order, beat, license, payment);
    await notifyAdminNewOrder(order, beat, payment);
  }
  return payment;
}

/** Admin confirms a payment → order is paid and the beat is emailed + download link issued. */
export async function confirmPayment(paymentId: string, admin: { id: string; name: string }) {
  const payment = paymentById(paymentId);
  if (!payment) throw new Error("Payment not found.");
  if (payment.status === "CONFIRMED") throw new Error("Payment already confirmed.");
  const order = orderById(payment.orderId);
  if (!order) throw new Error("Order not found for payment.");
  const beat = beatById(order.beatId);
  const license = licenseById(order.licenseId);
  if (!beat || !license) throw new Error("Order references missing beat or license.");

  const data = db();
  const now = new Date().toISOString();
  payment.status = "CONFIRMED";
  payment.confirmedAt = now;
  payment.confirmedBy = admin.name;
  order.status = "PAID";
  order.paidAt = now;
  order.method = payment.method;
  beat.sales += 1;

  // Exclusive rights remove the beat from the store
  if (license.exclusive) beat.published = false;

  const download = {
    id: uid("dl"),
    orderId: order.id,
    userId: order.userId,
    beatId: beat.id,
    token: randomToken(),
    count: 0,
    createdAt: now,
    lastAt: null,
  };
  data.downloads.push(download);
  order.status = "DELIVERED";
  order.deliveredAt = now;
  persist("payments", "orders", "beats", "downloads");

  await notifyBeatDelivered(order, beat, license, download.token);
  return { payment, order, download };
}

export async function failPayment(paymentId: string) {
  const payment = paymentById(paymentId);
  if (!payment) throw new Error("Payment not found.");
  payment.status = "FAILED";
  persist("payments");
  return payment;
}

export async function cancelOrder(orderId: string, reason = "No payment was received within 24 hours.") {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "DELIVERED") throw new Error("Delivered orders cannot be cancelled.");
  const data = db();
  for (const payment of data.payments.filter((p) => p.orderId === order.id && p.status === "PENDING")) {
    payment.status = "FAILED";
  }
  order.status = "CANCELLED";
  persist("orders", "payments");
  const beat = beatById(order.beatId);
  if (beat) await notifyOrderCancelled(order, beat, reason);
  return order;
}

/* ------------------------------------------------------------------ helpers */

export function downloadForOrder(orderId: string) {
  return db().downloads.find((d) => d.orderId === orderId) ?? null;
}

export function beatFilesForLicense(beat: Beat, license: License) {
  return beat.files.filter((f) => f.tier === "*" || f.tier === license.slug);
}

export function methodLabel(method: PaymentMethod | null) {
  if (method === "MOBILE_MONEY") return "Mobile money";
  if (method === "BANK") return "Bank transfer";
  if (method === "CARD") return "Card";
  return "—";
}
