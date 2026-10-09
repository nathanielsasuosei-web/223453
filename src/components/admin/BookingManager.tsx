"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { labelTime, prettyDate } from "@/lib/studio";
import type { BookingStatus, PaymentMethod } from "@/lib/store";
import { Spinner } from "../ui";
import { BookingPill } from "../BookingCheckout";

interface BookingPayment {
  id: string;
  method: PaymentMethod;
  provider: string;
  phone: string;
  reference: string;
  amountCents: number;
  kind: "FULL" | "DEPOSIT" | "BALANCE";
  status: "PENDING" | "CONFIRMED" | "FAILED";
  note: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface AdminBooking {
  id: string;
  code: string;
  status: BookingStatus;
  serviceName: string;
  date: string;
  start: string;
  hours: number;
  notes: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  depositPercent: number;
  balancePaidAt: string | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  payments: BookingPayment[];
}

const FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "UPCOMING", label: "Upcoming" },
  { id: "AWAITING_CONFIRMATION", label: "Payments to confirm" },
  { id: "PENDING_PAYMENT", label: "Deposit due" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function BookingManager({
  bookings,
  counts,
  filter,
  currencySymbol,
}: {
  bookings: AdminBooking[];
  counts: Record<string, number>;
  filter: string;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  async function act(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update the booking.");
      setNotice("Booking updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <a
            key={f.id}
            href={`/admin/bookings?status=${f.id}`}
            className={`chip ${filter === f.id ? "!border-brand/50 !text-white" : ""}`}
          >
            {f.label}
            <span className="ml-1.5 text-[10px] text-muted-2">{counts[f.id] ?? 0}</span>
          </a>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {bookings.length ? (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const expanded = open === booking.id;
            const pending = booking.payments.filter((p) => p.status === "PENDING");
            const balanceOutstanding = booking.balanceCents > 0 && !booking.balancePaidAt;
            const busy = busyId === booking.id;

            return (
              <article key={booking.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{booking.serviceName}</h3>
                      <BookingPill status={booking.status} />
                      {balanceOutstanding && (
                        <span className="badge border border-amber-500/30 bg-amber-500/10 text-amber-300">
                          Balance {formatMoney(booking.balanceCents, booking.currency, currencySymbol)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {prettyDate(booking.date)} · {labelTime(booking.start)} · {booking.hours} hr
                      {booking.hours === 1 ? "" : "s"} · <span className="font-mono">{booking.code}</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-2">
                      {booking.userName} · {booking.userEmail}
                      {booking.userPhone ? ` · ${booking.userPhone}` : ""} · booked {timeAgo(booking.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                        Total
                      </p>
                      <p className="text-base font-extrabold text-white">
                        {formatMoney(booking.totalCents, booking.currency, currencySymbol)}
                      </p>
                      <p className="text-[11px] text-muted-2">
                        deposit {formatMoney(booking.depositCents, booking.currency, currencySymbol)}
                      </p>
                    </div>
                    <button
                      onClick={() => setOpen(expanded ? null : booking.id)}
                      className="btn btn-ghost text-xs"
                    >
                      {expanded ? "Hide" : "Details"}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-line bg-ink-2/40 p-4">
                    {booking.notes && (
                      <p className="mb-3 rounded-lg border border-line bg-ink-2 p-3 text-xs leading-relaxed text-muted">
                        <span className="font-semibold text-muted-2">Notes: </span>
                        {booking.notes}
                      </p>
                    )}

                    <div className="space-y-2">
                      {booking.payments.length ? (
                        booking.payments.map((p) => (
                          <div
                            key={p.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-ink-2 px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-white">
                                {p.kind === "BALANCE" ? "Balance" : "Deposit"} ·{" "}
                                {formatMoney(p.amountCents, booking.currency, currencySymbol)} ·{" "}
                                {p.method === "BANK" ? "Bank transfer" : p.provider || "Mobile money"}
                              </p>
                              <p className="text-muted-2">
                                Ref {p.reference || "—"}
                                {p.phone ? ` · ${p.phone}` : ""} · {formatDateTime(p.createdAt)}
                                {p.confirmedAt ? ` · confirmed by ${p.confirmedBy ?? "studio"}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`badge border ${
                                  p.status === "CONFIRMED"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                    : p.status === "PENDING"
                                      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                                }`}
                              >
                                {p.status.toLowerCase()}
                              </span>
                              {p.status === "PENDING" && (
                                <button
                                  disabled={busy}
                                  onClick={() => act(booking.id, { action: "confirm-payment", paymentId: p.id })}
                                  className="btn btn-primary px-3 py-1.5 text-[11px]"
                                >
                                  {busy ? <Spinner /> : "Confirm"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-2">No payment submitted yet.</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {balanceOutstanding && booking.status !== "CANCELLED" && (
                        <button
                          disabled={busy}
                          onClick={() => act(booking.id, { action: "balance-paid" })}
                          className="btn btn-ghost text-xs"
                        >
                          {busy ? <Spinner /> : "Mark balance paid"}
                        </button>
                      )}
                      {booking.status === "CONFIRMED" && (
                        <button
                          disabled={busy}
                          onClick={() => act(booking.id, { action: "complete" })}
                          className="btn btn-ghost text-xs"
                        >
                          {busy ? <Spinner /> : "Mark session complete"}
                        </button>
                      )}
                      {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
                        <button
                          disabled={busy}
                          onClick={() => act(booking.id, { action: "cancel", reason: "Cancelled by the studio." })}
                          className="btn btn-ghost text-xs !text-rose-300"
                        >
                          {busy ? <Spinner /> : "Cancel & release slot"}
                        </button>
                      )}
                      {pending.length === 0 && booking.status === "PENDING_PAYMENT" && (
                        <span className="text-[11px] text-muted-2">
                          Waiting on the deposit — the slot is held.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">No bookings here yet.</p>
          <p className="mt-1 text-xs text-muted-2">
            Bookings land here as soon as an artist pays a deposit on /studio.
          </p>
        </div>
      )}
    </div>
  );
}
