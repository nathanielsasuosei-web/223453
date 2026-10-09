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
  type PaymentPlan,
  type PaymentStage,
  type User,
} from "./store";
import { randomToken } from "./upload";
import {
  notifyAdminNewOrder,
  notifyBalanceDue,
  notifyBeatDelivered,
  notifyOrderCancelled,
  notifyOrderCreated,
  notifyPaymentInstructions,
} from "./notifications";
import { splitBill } from "./studio";

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

/** Below this price a 50/50 split doesn't make sense (under $10 a half is pocket change). */
export const MIN_SPLIT_CENTS = 1000;

export async function createOrder(
  user: User,
  beatId: string,
  licenseId: string,
  plan: PaymentPlan = "FULL",
) {
  const beat = beatById(beatId);
  if (!beat || !beat.published) throw new Error("That beat is not available.");
  const license = licenseById(licenseId);
  if (!license || !license.active) throw new Error("That license is not available.");

  const data = db();
  const halfAllowed = data.settings.allowHalfPayments !== false && license.priceCents >= MIN_SPLIT_CENTS;
  const settledPlan: PaymentPlan = plan === "HALF" && halfAllowed ? "HALF" : "FULL";
  const { depositCents, balanceCents } = splitBill(license.priceCents, settledPlan === "HALF" ? 50 : 100);

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
    plan: settledPlan,
    depositCents,
    balanceCents,
    balancePaidAt: null,
    balancePaymentId: null,
  };
  data.orders.unshift(order);
  persist("orders");
  await notifyOrderCreated(order, beat, license);
  return { order, beat, license };
}

/** How much the artist has to send right now: deposit for HALF plans, else the full price. */
export function amountDueCents(order: Order) {
  if (order.plan !== "HALF" || !order.balanceCents) return order.amountCents;
  if (order.balancePaidAt) return 0;
  return order.paidAt ? order.balanceCents : order.depositCents || order.amountCents;
}

/** The outstanding half of a HALF plan (0 once the balance is settled). */
export function balanceDueCents(order: Order) {
  if (order.plan !== "HALF" || order.balancePaidAt) return 0;
  return order.balanceCents;
}

/** Which part of the bill the next payment covers. */
export function nextPaymentStage(order: Order): PaymentStage {
  if (order.plan !== "HALF" || !order.balanceCents) return "FULL";
  return order.paidAt ? "BALANCE" : "DEPOSIT";
}

export async function submitMobileMoneyPayment(orderId: string, input: { provider: string; phone: string }) {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  // A HALF order stays "PAID" until the balance lands, so allow that second payment
  if ((order.status === "PAID" || order.status === "DELIVERED") && balanceDueCents(order) <= 0) {
    throw new Error("This order is already paid.");
  }
  if (!input.phone || input.phone.replace(/\D/g, "").length < 9) {
    throw new Error("Enter a valid mobile money phone number.");
  }

  const stage = nextPaymentStage(order);
  const data = db();
  const payment: Payment = {
    id: uid("pay"),
    orderId: order.id,
    bookingId: null,
    method: "MOBILE_MONEY",
    provider: input.provider,
    phone: input.phone,
    reference: `${stage === "BALANCE" ? `MM-${order.code}-BAL` : `MM-${order.code}`}`,
    amountCents: amountDueCents(order),
    currency: order.currency,
    status: "PENDING",
    kind: stage,
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
  // A HALF order stays "PAID" until the balance lands, so allow that second payment
  if ((order.status === "PAID" || order.status === "DELIVERED") && balanceDueCents(order) <= 0) {
    throw new Error("This order is already paid.");
  }

  const stage = nextPaymentStage(order);
  const data = db();
  const payment: Payment = {
    id: uid("pay"),
    orderId: order.id,
    bookingId: null,
    method: "BANK",
    provider: data.settings.bankAccount.bankName || "Bank transfer",
    phone: "",
    reference: input.reference?.trim() || (stage === "BALANCE" ? `${order.code}-BAL` : order.code),
    amountCents: amountDueCents(order),
    currency: order.currency,
    status: "PENDING",
    kind: stage,
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

  /* ---------------- settling the balance of a 50/50 order → release the files */
  if (payment.kind === "BALANCE") {
    order.balancePaidAt = now;
    order.balancePaymentId = payment.id;
    order.method = payment.method;
    order.status = "PAID";
    persist("payments", "orders");
    const delivered = await deliverOrder(order.id);
    return { payment, order, download: delivered };
  }

  order.status = "PAID";
  order.paidAt = now;
  order.method = payment.method;
  beat.sales += 1;

  // Exclusive rights remove the beat from the store
  if (license.exclusive) beat.published = false;

  persist("payments", "orders", "beats");

  // Half-now orders wait for the balance before the files are released
  if (balanceDueCents(order) > 0) {
    await notifyBalanceDue(order, beat, license);
    return { payment, order, download: null };
  }

  const download = await deliverOrder(order.id);
  return { payment, order, download };
}

/** Issue the download + email for a fully paid order (idempotent). */
export async function deliverOrder(orderId: string) {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  const beat = beatById(order.beatId);
  const license = licenseById(order.licenseId);
  if (!beat || !license) throw new Error("Order references missing beat or license.");

  const existing = downloadForOrder(order.id);
  if (existing && order.status === "DELIVERED") return existing;

  const data = db();
  const now = new Date().toISOString();
  const download =
    existing ??
    {
      id: uid("dl"),
      orderId: order.id,
      userId: order.userId,
      beatId: beat.id,
      token: randomToken(),
      count: 0,
      createdAt: now,
      lastAt: null,
    };
  if (!existing) data.downloads.push(download);

  if (!order.paidAt) order.paidAt = now;
  order.status = "DELIVERED";
  order.deliveredAt = now;
  persist("orders", "downloads");

  await notifyBeatDelivered(order, beat, license, download.token);
  return download;
}

/** Admin records the balance being paid in cash / at the studio. */
export async function markBalancePaid(orderId: string, admin: { id: string; name: string }) {
  const order = orderById(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.plan !== "HALF" || !order.balanceCents) throw new Error("This order has no balance left to pay.");
  if (order.balancePaidAt) throw new Error("The balance is already settled.");

  const data = db();
  const now = new Date().toISOString();
  const payment: Payment = {
    id: uid("pay"),
    orderId: order.id,
    bookingId: null,
    method: order.method ?? "BANK",
    provider: "Paid at the studio",
    phone: "",
    reference: `${order.code}-BAL`,
    amountCents: order.balanceCents,
    currency: order.currency,
    status: "CONFIRMED",
    kind: "BALANCE",
    proofPath: null,
    note: `Balance recorded by ${admin.name}`,
    createdAt: now,
    confirmedAt: now,
    confirmedBy: admin.name,
  };
  order.balancePaidAt = now;
  order.balancePaymentId = payment.id;
  data.payments.unshift(payment);
  persist("payments", "orders");
  const download = await deliverOrder(order.id);
  return { payment, order: orderById(order.id) ?? order, download };
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
