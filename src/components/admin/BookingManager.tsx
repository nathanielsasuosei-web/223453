"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { Spinner } from "../ui";

type Status = "PENDING_DEPOSIT" | "AWAITING_DEPOSIT" | "DEPOSIT_PAID" | "AWAITING_BALANCE" | "PAID" | "CANCELLED";

interface Payment {
  id: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD";
  purpose: "ORDER" | "SESSION_DEPOSIT" | "SESSION_BALANCE";
  provider: string;
  phone: string;
  reference: string;
  amountCents: number;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  note: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  proofUrl: string;
}

interface Booking {
  id: string;
  code: string;
  status: Status;
  service: string;
  sessionDate: string;
  sessionTime: string;
  phone: string;
  note: string;
  priceCents: number;
  depositCents: number;
  balanceCents: number;
  currency: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD" | null;
  createdAt: string;
  depositPaidAt: string | null;
  paidAt: string | null;
  userName: string;
  userEmail: string;
  payments: Payment[];
}

const FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "AWAITING_DEPOSIT", label: "Awaiting deposit" },
  { id: "DEPOSIT_PAID", label: "Deposit paid" },
  { id: "AWAITING_BALANCE", label: "Awaiting balance" },
  { id: "PAID", label: "Paid in full" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function BookingManager({
  bookings: initialBookings,
  counts,
  filter,
  currencySymbol,
}: {
  bookings: Booking[];
  counts: Record<string, number>;
  filter: string;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialBookings[0]?.id ?? null);

  async function confirm(booking: Booking, payment: Payment) {
    setBusyId(payment.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not confirm the payment.");
      const now = new Date().toISOString();
      const confirmedPurpose = payment.purpose;
      setNotice(
        confirmedPurpose === "SESSION_BALANCE"
          ? `${booking.code} paid in full — the artist was emailed.`
          : `${booking.code} deposit confirmed — the slot is secured and the artist was emailed.`,
      );
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: confirmedPurpose === "SESSION_BALANCE" ? "PAID" : "DEPOSIT_PAID",
                paidAt: confirmedPurpose === "SESSION_BALANCE" ? now : b.paidAt,
                depositPaidAt: confirmedPurpose === "SESSION_DEPOSIT" ? now : b.depositPaidAt,
                payments: b.payments.map((p) =>
                  p.id === payment.id
                    ? { ...p, status: "CONFIRMED", confirmedAt: now }
                    : p,
                ),
              }
            : b,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(booking: Booking) {
    const reason = window.prompt(
      `Cancel ${booking.code}? Add a short reason for the artist (optional).`,
      "The studio had to release your slot.",
    );
    if (reason === null) return;
    setBusyId(booking.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not cancel the booking.");
      setBookings((prev) =>
        prev.map((b) =>
          b.id === booking.id
            ? {
                ...b,
                status: "CANCELLED",
                payments: b.payments.map((p) => (p.status === "PENDING" ? { ...p, status: "FAILED" } : p)),
              }
            : b,
        ),
      );
      setNotice(`${booking.code} cancelled and the artist was emailed.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Session bookings</h2>
        <p className="mt-1 text-xs text-muted">
          Artists pay a deposit to secure a slot and the balance before the session. Confirm a payment
          and the artist is emailed instantly.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Link
              key={f.id}
              href={f.id === "ALL" ? "/admin/bookings" : `/admin/bookings?status=${f.id}`}
              className={`chip ${active ? "!border-brand/60 !text-white" : ""}`}
            >
              {f.label}
              <span className="text-muted-2">{counts[f.id] ?? 0}</span>
            </Link>
          );
        })}
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

      {bookings.length === 0 && (
        <p className="card px-5 py-10 text-center text-sm text-muted">
          No session bookings in this view yet.
        </p>
      )}

      <div className="space-y-4">
        {bookings.map((booking) => {
          const open = openId === booking.id;
          const pendingPayment = booking.payments.find((p) => p.status === "PENDING");
          return (
            <div key={booking.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : booking.id)}
                className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-panel/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{booking.code}</span>
                    <StatusPill status={booking.status} />
                    {pendingPayment && (
                      <span className="badge bg-amber-500/15 text-amber-300">Payment to verify</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    <span className="font-semibold text-white">{booking.userName}</span> · {booking.userEmail} ·{" "}
                    {booking.service} · {formatDate(booking.sessionDate)} {booking.sessionTime}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tracking-tight text-white">
                    {formatMoney(booking.priceCents, booking.currency, currencySymbol)}
                  </p>
                  <p className="text-xs text-muted-2">{timeAgo(booking.createdAt)}</p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className={`shrink-0 text-muted-2 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {open && (
                <div className="border-t border-line px-5 py-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <Detail label="Artist" value={`${booking.userName} (${booking.userEmail})`} />
                    <Detail label="Service" value={booking.service} />
                    <Detail label="Session" value={`${formatDate(booking.sessionDate)} · ${booking.sessionTime}`} />
                    <Detail label="Phone" value={booking.phone || "—"} />
                    <Detail label="Placed" value={formatDateTime(booking.createdAt)} />
                    {booking.depositPaidAt && <Detail label="Deposit paid" value={formatDateTime(booking.depositPaidAt)} />}
                    {booking.paidAt && <Detail label="Paid in full" value={formatDateTime(booking.paidAt)} />}
                  </dl>

                  {booking.note && (
                    <div className="mt-3 rounded-xl border border-line bg-ink-2 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Artist&apos;s note</p>
                      <p className="mt-1 text-sm text-muted">{booking.note}</p>
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {booking.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-line bg-ink-2 px-4 py-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-white">
                              {payment.method === "MOBILE_MONEY" ? "📲 Mobile money" : "🏦 Bank transfer"}
                              {payment.provider ? ` · ${payment.provider}` : ""}
                              {payment.purpose === "SESSION_BALANCE" ? " · balance" : " · deposit"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-2">
                              Submitted {formatDateTime(payment.createdAt)}
                              {payment.confirmedAt ? ` · confirmed ${formatDateTime(payment.confirmedAt)}` : ""}
                              {payment.confirmedBy ? ` by ${payment.confirmedBy}` : ""}
                            </p>
                          </div>
                          <span
                            className={`badge ${
                              payment.status === "CONFIRMED"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : payment.status === "FAILED"
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                          <Detail label="Reference" value={payment.reference || "—"} mono />
                          <Detail label="Payer number" value={payment.phone || "—"} />
                          <Detail
                            label="Amount"
                            value={formatMoney(payment.amountCents, booking.currency, currencySymbol)}
                          />
                          {payment.note && <Detail label="Note" value={payment.note} />}
                        </div>

                        {payment.proofUrl && (
                          <a
                            href={payment.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="link mt-3 inline-block text-xs font-semibold"
                          >
                            View uploaded receipt →
                          </a>
                        )}

                        {payment.status === "PENDING" && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => confirm(booking, payment)}
                              disabled={busyId === payment.id}
                              className="btn btn-primary text-xs"
                            >
                              {busyId === payment.id ? (
                                <>
                                  <Spinner /> Confirming…
                                </>
                              ) : payment.purpose === "SESSION_BALANCE" ? (
                                "Confirm balance — paid in full"
                              ) : (
                                "Confirm deposit — secure the slot"
                              )}
                            </button>
                            <button
                              onClick={() => cancel(booking)}
                              disabled={busyId === booking.id}
                              className="btn btn-danger text-xs"
                            >
                              Cancel booking
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {booking.payments.length === 0 && (
                      <p className="text-sm text-muted">
                        No payment submitted yet — the artist still needs to pay the deposit.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, string> = {
    PENDING_DEPOSIT: "bg-amber-500/15 text-amber-300",
    AWAITING_DEPOSIT: "bg-sky-500/15 text-sky-300",
    DEPOSIT_PAID: "bg-emerald-500/15 text-emerald-300",
    AWAITING_BALANCE: "bg-sky-500/15 text-sky-300",
    PAID: "bg-emerald-500/15 text-emerald-300",
    CANCELLED: "bg-rose-500/15 text-rose-300",
  };
  const label = status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return <span className={`badge ${map[status]}`}>{label}</span>;
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">{label}</dt>
      <dd className={`mt-0.5 text-sm text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
