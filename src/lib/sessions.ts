import "server-only";
import {
  db,
  persist,
  randomCode,
  uid,
  sessionBookingById,
  SESSION_SERVICES,
  type Payment,
  type PaymentMethod,
  type SessionBooking,
  type SessionService,
  type User,
} from "./store";
import {
  notifyAdminNewBooking,
  notifySessionBooked,
  notifySessionCancelled,
  notifySessionDepositPaid,
  notifySessionPaid,
  notifySessionPaymentInstructions,
} from "./notifications";

/* ------------------------------------------------------------------ pricing */

export function sessionsEnabled() {
  return db().settings.sessions.enabled;
}

export function isSessionService(value: string): value is SessionService {
  return SESSION_SERVICES.some((s) => s.slug === value);
}

export function sessionPriceCents(service: SessionService) {
  const s = db().settings.sessions;
  if (service === "recording") return s.recordingPriceCents;
  if (service === "mixing") return s.mixingPriceCents;
  return s.masteringPriceCents;
}

export function depositCentsFor(priceCents: number) {
  const pct = db().settings.sessions.depositPercent;
  return Math.round((priceCents * pct) / 100);
}

export type SessionDue = { amountCents: number; purpose: "SESSION_DEPOSIT" | "SESSION_BALANCE" };

/** What the artist still needs to pay for this booking, or null when nothing is due. */
export function dueForBooking(booking: SessionBooking): SessionDue | null {
  if (booking.status === "PENDING_DEPOSIT") {
    return { amountCents: booking.depositCents, purpose: "SESSION_DEPOSIT" };
  }
  if (booking.status === "DEPOSIT_PAID" && booking.balanceCents > 0) {
    return { amountCents: booking.balanceCents, purpose: "SESSION_BALANCE" };
  }
  return null;
}

/* ------------------------------------------------------------------ booking */

export async function createSessionBooking(
  user: User,
  input: { service: string; sessionDate: string; sessionTime: string; phone: string; note: string },
) {
  const settings = db().settings;
  if (!settings.sessions.enabled) throw new Error("Session bookings are not open right now.");
  if (!isSessionService(input.service)) throw new Error("Pick a service to book.");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) throw new Error("Pick a session date.");
  const date = new Date(`${input.sessionDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (Number.isNaN(date.getTime()) || date < today) {
    throw new Error("Pick a session date from today onwards.");
  }
  if (!/^\d{2}:\d{2}$/.test(input.sessionTime)) throw new Error("Pick a start time.");

  const phone = input.phone.trim();
  if (phone.replace(/\D/g, "").length < 7) {
    throw new Error("Enter a valid phone number so the studio can reach you.");
  }

  const priceCents = sessionPriceCents(input.service);
  if (priceCents <= 0) throw new Error("This service is not priced yet — message the studio instead.");

  const depositCents = depositCentsFor(priceCents);
  const data = db();
  const booking: SessionBooking = {
    id: uid("bkg"),
    code: `SB-${randomCode(6)}`,
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    service: input.service,
    priceCents,
    depositCents,
    balanceCents: priceCents - depositCents,
    currency: settings.currency,
    sessionDate: input.sessionDate,
    sessionTime: input.sessionTime,
    phone,
    note: input.note.trim(),
    status: "PENDING_DEPOSIT",
    method: null,
    reference: randomCode(4),
    createdAt: new Date().toISOString(),
    depositPaidAt: null,
    paidAt: null,
  };
  data.sessionBookings.unshift(booking);
  persist("sessionBookings");

  await notifySessionBooked(booking);
  await notifyAdminNewBooking(booking, null);
  return booking;
}

/* ------------------------------------------------------------------ payments */

async function submitSessionPayment(
  bookingId: string,
  method: PaymentMethod,
  input: { provider?: string; phone?: string; reference?: string; note?: string; proofPath?: string | null },
) {
  const booking = sessionBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CANCELLED") throw new Error("This booking was cancelled.");
  const due = dueForBooking(booking);
  if (!due) throw new Error("Nothing is due for this booking right now.");
  if (method === "MOBILE_MONEY" && (!input.phone || input.phone.replace(/\D/g, "").length < 9)) {
    throw new Error("Enter a valid mobile money phone number.");
  }

  const data = db();
  const payment: Payment = {
    id: uid("pay"),
    orderId: "",
    bookingId: booking.id,
    purpose: due.purpose,
    method,
    provider:
      method === "MOBILE_MONEY"
        ? input.provider ?? ""
        : data.settings.bankAccount.bankName || "Bank transfer",
    phone: input.phone ?? "",
    reference: method === "MOBILE_MONEY" ? `MM-${booking.code}` : input.reference?.trim() || booking.code,
    amountCents: due.amountCents,
    currency: booking.currency,
    status: "PENDING",
    proofPath: input.proofPath ?? null,
    note: input.note?.trim() ?? "",
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedBy: null,
  };
  data.payments.unshift(payment);
  booking.status = due.purpose === "SESSION_DEPOSIT" ? "AWAITING_DEPOSIT" : "AWAITING_BALANCE";
  booking.method = method;
  persist("payments", "sessionBookings");

  await notifySessionPaymentInstructions(booking, payment);
  await notifyAdminNewBooking(booking, payment);
  return payment;
}

export function submitSessionMomoPayment(bookingId: string, input: { provider: string; phone: string }) {
  return submitSessionPayment(bookingId, "MOBILE_MONEY", input);
}

export function submitSessionBankPayment(
  bookingId: string,
  input: { reference: string; note: string; proofPath: string | null },
) {
  return submitSessionPayment(bookingId, "BANK", input);
}

/** Admin confirms a session payment: a deposit secures the slot, a balance completes it. */
export async function confirmSessionPayment(paymentId: string, admin: { id: string; name: string }) {
  const payment = db().payments.find((p) => p.id === paymentId);
  if (!payment) throw new Error("Payment not found.");
  if (!payment.bookingId) throw new Error("This payment is not linked to a session booking.");
  if (payment.status === "CONFIRMED") throw new Error("Payment already confirmed.");
  const booking = sessionBookingById(payment.bookingId);
  if (!booking) throw new Error("Booking not found for payment.");

  const now = new Date().toISOString();
  payment.status = "CONFIRMED";
  payment.confirmedAt = now;
  payment.confirmedBy = admin.name;
  booking.method = payment.method;

  if (payment.purpose === "SESSION_BALANCE") {
    booking.status = "PAID";
    booking.paidAt = now;
  } else {
    booking.depositPaidAt = now;
    if (booking.balanceCents > 0) {
      booking.status = "DEPOSIT_PAID";
    } else {
      booking.status = "PAID";
      booking.paidAt = now;
    }
  }
  persist("payments", "sessionBookings");

  if (booking.status === "PAID") await notifySessionPaid(booking);
  else await notifySessionDepositPaid(booking);
  return { payment, booking };
}

export async function cancelSessionBooking(
  bookingId: string,
  reason = "The studio had to release your slot.",
) {
  const booking = sessionBookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "PAID") throw new Error("Fully paid bookings cannot be cancelled here.");
  if (booking.status === "CANCELLED") throw new Error("Booking already cancelled.");
  const data = db();
  for (const payment of data.payments.filter((p) => p.bookingId === booking.id && p.status === "PENDING")) {
    payment.status = "FAILED";
  }
  booking.status = "CANCELLED";
  persist("sessionBookings", "payments");
  await notifySessionCancelled(booking, reason);
  return booking;
}
