/**
 * Studio booking maths — calendar slots, availability and deposit splits.
 *
 * Client-safe: types only are imported from the store, so this can be used
 * from both server components and the booking wizard.
 */
import type { Booking, StudioDay, StudioService, StudioSettings } from "./store";

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** 09:00 → 540 */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":");
  const hours = Number(h);
  const mins = Number(m ?? 0);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return 0;
  return hours * 60 + mins;
}

/** 540 → "09:00" */
export function fromMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "14:30" → "2:30 PM" */
export function labelTime(hhmm: string): string {
  const total = toMinutes(hhmm);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "2026-10-12" → Date at local midnight (no timezone drift). */
export function parseDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(now = new Date()): string {
  return dateKey(now);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function weekdayOf(date: string): number {
  return parseDate(date).getDay();
}

export function prettyDate(date: string): string {
  return parseDate(date).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function dayFor(studio: StudioSettings, date: string): StudioDay {
  return studio.hours[String(weekdayOf(date))] ?? { open: "09:00", close: "17:00", closed: false };
}

/** Every bookable start time on a given day, e.g. ["09:00", "10:00", …]. */
export function slotStarts(day: StudioDay, slotMinutes = 60): string[] {
  if (day.closed) return [];
  const step = Math.max(15, slotMinutes);
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const out: string[] = [];
  for (let t = open; t < close; t += step) out.push(fromMinutes(t));
  return out;
}

/** Dates the calendar offers, starting today. */
export function bookableDates(studio: StudioSettings, now = new Date(), limit?: number): string[] {
  const start = dateKey(now);
  const days = Math.max(1, Math.min(365, studio.maxDaysAhead || 60));
  const out: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i);
    if (!dayFor(studio, date).closed) out.push(date);
    if (limit && out.length >= limit) break;
  }
  return out;
}

export interface Hold {
  date: string;
  start: string;
  hours: number;
}

/** Compact calendar hold list for every booking that isn't cancelled. */
export function holdsFrom(bookings: Pick<Booking, "date" | "start" | "hours" | "status">[]): Hold[] {
  return bookings
    .filter((b) => b.status !== "CANCELLED")
    .map((b) => ({ date: b.date, start: b.start, hours: b.hours }));
}

/** Two [start, start + hours) ranges overlap? */
export function overlaps(aStart: number, aHours: number, bStart: number, bHours: number): boolean {
  return aStart < bStart + bHours && bStart < aStart + aHours;
}

export interface SlotCheck {
  ok: boolean;
  reason?: "past" | "closed" | "outside-hours" | "taken" | "lead-time";
}

/**
 * Can `hours` be booked starting at `date` + `start`?
 * Checks opening hours, lead time and every slot the session would occupy.
 */
export function checkSlot(
  studio: StudioSettings,
  holds: Hold[],
  date: string,
  start: string,
  hours: number,
  now = new Date(),
): SlotCheck {
  const day = dayFor(studio, date);
  if (day.closed) return { ok: false, reason: "closed" };

  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const from = toMinutes(start);
  const to = from + Math.round(hours * 60);
  if (from < open || to > close) return { ok: false, reason: "outside-hours" };

  const startAt = parseDate(date);
  startAt.setHours(0, 0, 0, 0);
  startAt.setMinutes(from);
  const leadMs = Math.max(0, studio.leadTimeHours || 0) * 3600_000;
  if (startAt.getTime() - leadMs < now.getTime()) return { ok: false, reason: "past" };

  const spanMinutes = Math.round(hours * 60);
  for (const hold of holds) {
    if (hold.date !== date) continue;
    if (overlaps(from, spanMinutes, toMinutes(hold.start), Math.round(hold.hours * 60))) {
      return { ok: false, reason: "taken" };
    }
  }
  return { ok: true };
}

/** Split a bill into the deposit due now and the balance due later. */
export function splitBill(totalCents: number, depositPercent: number) {
  const percent = Math.max(0, Math.min(100, depositPercent));
  const depositCents =
    percent >= 100 ? totalCents : percent <= 0 ? 0 : Math.round((totalCents * percent) / 100);
  return { depositCents, balanceCents: Math.max(0, totalCents - depositCents) };
}

export function serviceQuote(
  service: Pick<StudioService, "priceCents" | "minHours" | "maxHours">,
  hours: number,
  depositPercent: number,
) {
  const h = Math.max(service.minHours, Math.min(service.maxHours, hours));
  const totalCents = service.priceCents * h;
  return { hours: h, totalCents, ...splitBill(totalCents, depositPercent) };
}

export function hoursLabel(hours: number) {
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/** "Recording · Sun 12 Oct · 2:00 PM · 3 hrs" */
export function bookingSummary(serviceName: string, date: string, start: string, hours: number) {
  return `${serviceName} · ${prettyDate(date)} · ${labelTime(start)} · ${hoursLabel(hours)}`;
}

export const BOOKING_STATUS_LABEL: Record<Booking["status"], string> = {
  PENDING_PAYMENT: "Deposit due",
  AWAITING_CONFIRMATION: "Payment sent",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
