import "server-only";
import {
  blockingBookings,
  bookingById,
  db,
  persist,
  randomCode,
  serviceById,
  uid,
  type Booking,
  type Payment,
  type PaymentMethod,
  type StudioService,
  type User,
} from "./store";
import {
  addDays,
  bookableDates,
  checkSlot,
  dayFor,
  holdsFrom,
  labelTime,
  prettyDate,
  serviceQuote,
  slotStarts,
  todayKey,
} from "./studio";
import {
  notifyAdminNewBooking,
  notifyBookingBalancePaid,
  notifyBookingCancelled,
  notifyBookingConfirmed,
  notifyBookingPaymentInstructions,
  notifyBookingRequested,
} from "./notifications";

export interface CreateBookingInput {
  serviceId: string;
  date: string;
  start: string;
  hours: number;
  notes?: string;
  phone?: string;
}

/**
 * Create a booking request. The slot is held as soon as the booking exists and
 * is locked in when the deposit is confirmed.
 */
export async function createBooking(user: User, input: CreateBookingInput) {
  const data = db();
  const studio = data.settings.studio;
  if (!studio.enabled) throw new Error("Studio bookings are closed right now — message the studio instead.");

  const service = serviceById(input.serviceId);
  if (!service || !service.active) throw new Error("Pick a service first.");

  const hours = Math.round(Number(input.hours));
  if (!Number.isFinite(hours) || hours < service.minHours || hours > service.maxHours) {
    throw new Error(`${service.name} sessions run ${service.minHours}–${service.maxHours} hours.`);
  }

  const date = String(input.date ?? "").slice(0, 10);
  const start = String(input.start ?? "").slice(0, 5);
  const window = bookableDates(studio);
  if (!window.includes(date)) {
    throw new Error(
      date < todayKey()
        ? "That date has already passed."
        : `Pick a date within the next ${studio.maxDaysAhead} days.`,
    );
  }

  const slot = checkSlot(studio, holdsFrom(blockingBookings()), date, start, hours);
  if (!slot.ok) throw new Error(slotMessage(slot.reason, date, start, hours));

  const quote = serviceQuote(service, hours, studio.depositPercent);
  const now = new Date().toISOString();
  const booking: Booking = {
    id: uid("bkg"),
    code: `BK-${randomCode(6)}`,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    userPhone: (input.phone ?? user.phone ?? "").trim(),
    serviceId: service.id,
    serviceName: service.name,
    date,
    start,
    hours: quote.hours,
    notes: (input.notes ?? "").trim().slice(0, 2000),
    totalCents: quote.totalCents,
    depositPercent: studio.depositPercent,
    depositCents: quote.depositCents,
    balanceCents: quote.balanceCents,
    currency: data.settings.currency,
    status: "PENDING_PAYMENT",
    paymentId: null,
    balancePaidAt: null,
    balanceMethod: null,
    confirmedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    createdAt: now,
    updatedAt: now,
  };

  data.bookings.unshift(booking);
  persist("bookings");

  await notifyBookingRequested(booking, service);
  await notifyAdminNewBooking(booking);
  return booking;
}

/** Start times for a date with their availability for a given session length. */
export function availabilityFor(date: string, hours: number) {
  const studio = db().settings.studio;
  const holds = holdsFrom(blockingBookings());
  const day = dayFor(studio, date);
  return slotStarts(day, studio.slotMinutes).map((start) => {
    const check = checkSlot(studio, holds, date, start, hours);
    return { start, label: labelTime(start), available: check.ok, reason: check.reason };
  });
}

/* ---------------------------------------------------------------- payments */

export interface BookingPaymentInput {
  method: PaymentMethod;
  provider?: string;
  phone?: string;
  reference?: string;
  note?: string;
  proofPath?: string | null;
}

export async function submitBookingPayment(bookingId: string, user: User, input: BookingPaymentInput) {
  const booking = bookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.userId !== user.id) throw new Error("That booking isn't yours.");
  if (booking.status === "CANCELLED") throw new Error("This booking was cancelled.");
  if (booking.status === "COMPLETED") throw new Error("This session is already complete.");

  const payingBalance = booking.status === "CONFIRMED" && !booking.balancePaidAt;
  const amountCents = payingBalance ? booking.balanceCents : booking.depositCents;
  if (amountCents <= 0) throw new Error("Nothing left to pay on this booking.");

  if (input.method === "MOBILE_MONEY") {
    const digits = (input.phone ?? "").replace(/\D/g, "");
    if (digits.length < 9) throw new Error("Enter a valid mobile money phone number.");
  }

  const data = db();
  const reference =
    input.reference?.trim() ||
    (payingBalance ? `${booking.code}-BAL` : booking.code);

  const payment: Payment = {
    id: uid("pay"),
    orderId: "",
    bookingId: booking.id,
    method: input.method === "BANK" ? "BANK" : "MOBILE_MONEY",
    provider:
      input.method === "BANK"
        ? data.settings.bankAccount.bankName || "Bank transfer"
        : (input.provider ?? "").trim() || data.settings.momoAccounts[0]?.provider || "Mobile Money",
    phone: (input.phone ?? "").trim(),
    reference,
    amountCents,
    currency: booking.currency,
    status: "PENDING",
    kind: payingBalance ? "BALANCE" : "DEPOSIT",
    proofPath: input.proofPath ?? null,
    note: (input.note ?? "").trim(),
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedBy: null,
  };
  data.payments.unshift(payment);

  if (!payingBalance) {
    booking.status = "AWAITING_CONFIRMATION";
    booking.paymentId = payment.id;
  }
  booking.updatedAt = payment.createdAt;
  persist("payments", "bookings");

  await notifyBookingPaymentInstructions(booking, payment);
  return payment;
}

/** Admin confirms a deposit (or balance) payment. */
export async function confirmBookingPayment(paymentId: string, admin: { id: string; name: string }) {
  const payment = db().payments.find((p) => p.id === paymentId);
  if (!payment || !payment.bookingId) throw new Error("Payment not found.");
  if (payment.status === "CONFIRMED") throw new Error("Payment already confirmed.");
  const booking = bookingById(payment.bookingId);
  if (!booking) throw new Error("Booking not found for payment.");

  const now = new Date().toISOString();
  payment.status = "CONFIRMED";
  payment.confirmedAt = now;
  payment.confirmedBy = admin.name;

  if (payment.kind === "BALANCE") {
    booking.balancePaidAt = now;
    booking.balanceMethod = payment.method;
  } else {
    booking.status = "CONFIRMED";
    booking.confirmedAt = now;
    booking.paymentId = payment.id;
  }
  booking.updatedAt = now;
  persist("payments", "bookings");

  if (payment.kind === "BALANCE") await notifyBookingBalancePaid(booking);
  else await notifyBookingConfirmed(booking);
  return booking;
}

/** Producer took the balance in cash / at the studio. */
export async function markBookingBalancePaid(bookingId: string, admin: { id: string; name: string }) {
  const booking = bookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.balanceCents <= 0 || booking.balancePaidAt) {
    throw new Error("This booking has no balance left to pay.");
  }
  const now = new Date().toISOString();
  booking.balancePaidAt = now;
  booking.balanceMethod = "BANK";
  booking.updatedAt = now;
  persist("bookings");
  await notifyBookingBalancePaid(booking);
  return booking;
}

export async function completeBooking(bookingId: string, admin: { id: string; name: string }) {
  const booking = bookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CANCELLED") throw new Error("This booking was cancelled.");
  const now = new Date().toISOString();
  booking.status = "COMPLETED";
  booking.completedAt = now;
  if (!booking.balancePaidAt) {
    booking.balancePaidAt = now;
    booking.balanceMethod = "BANK";
  }
  booking.updatedAt = now;
  persist("bookings");
  void admin;
  return booking;
}

export async function cancelBooking(bookingId: string, admin: { id: string; name: string }, reason = "") {
  const booking = bookingById(bookingId);
  if (!booking) throw new Error("Booking not found.");
  if (booking.status === "CANCELLED") throw new Error("This booking is already cancelled.");
  const now = new Date().toISOString();
  booking.status = "CANCELLED";
  booking.cancelledAt = now;
  booking.cancelReason = reason.trim() || `Cancelled by ${admin.name}.`;
  booking.updatedAt = now;
  const data = db();
  for (const payment of data.payments) {
    if (payment.bookingId === booking.id && payment.status === "PENDING") payment.status = "FAILED";
  }
  persist("bookings", "payments");
  await notifyBookingCancelled(booking, booking.cancelReason);
  return booking;
}

/* ----------------------------------------------------------------- helpers */

export function bookingWindow() {
  const studio = db().settings.studio;
  const today = todayKey();
  return { from: today, to: addDays(today, studio.maxDaysAhead) };
}

export function upcomingBookings(limit = 5) {
  const today = todayKey();
  return [...db().bookings]
    .filter((b) => b.status === "CONFIRMED" && b.date >= today)
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`))
    .slice(0, limit);
}

function slotMessage(reason: string | undefined, date: string, start: string, hours: number) {
  const when = `${prettyDate(date)} at ${labelTime(start)}`;
  switch (reason) {
    case "past":
      return `That slot has already passed — pick a later start time.`;
    case "closed":
      return `The studio is closed on ${prettyDate(date)}.`;
    case "outside-hours":
      return `A ${hours}-hour session starting at ${labelTime(start)} runs past closing time.`;
    case "taken":
      return `${when} is already booked. Choose another start time.`;
    default:
      return `That slot isn't available.`;
  }
}

export type { StudioService };
