"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatMoney } from "@/lib/format";
import { bookingSummary, labelTime, prettyDate } from "@/lib/studio";
import type { BookingStatus } from "@/lib/store";
import { Spinner } from "./ui";

interface MomoAccount {
  provider: string;
  number: string;
  name: string;
}

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swift: string;
  branch: string;
}

export interface BookingView {
  id: string;
  code: string;
  status: BookingStatus;
  serviceName: string;
  date: string;
  start: string;
  hours: number;
  notes: string;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  depositPercent: number;
  balancePaidAt: string | null;
  createdAt: string;
}

export function BookingCheckout({
  booking: initial,
  currency,
  currencySymbol,
  momoAccounts,
  bankAccount,
  paymentInstructions,
  policy,
}: {
  booking: BookingView;
  currency: string;
  currencySymbol: string;
  momoAccounts: MomoAccount[];
  bankAccount: BankAccount;
  paymentInstructions: string;
  policy: string;
}) {
  const [booking, setBooking] = useState(initial);
  const [method, setMethod] = useState<"MOBILE_MONEY" | "BANK">("MOBILE_MONEY");
  const [provider, setProvider] = useState(momoAccounts[0]?.provider ?? "");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const waiting = booking.status === "AWAITING_CONFIRMATION";

  useEffect(() => {
    if (!waiting) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setBooking((b) => ({ ...b, status: data.booking.status, balancePaidAt: data.booking.balancePaidAt }));
      } catch {
        /* ignore */
      }
    };
    void poll();
    const timer = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [booking.id, waiting]);

  const confirmed = booking.status === "CONFIRMED" || booking.status === "COMPLETED";
  const balanceDue = confirmed && !booking.balancePaidAt ? booking.balanceCents : 0;
  const depositDue = !confirmed && booking.status !== "CANCELLED" ? booking.depositCents : 0;
  const amountDue = balanceDue || depositDue;
  const payingBalance = balanceDue > 0;
  const payReference = payingBalance ? `${booking.code}-BAL` : booking.code;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          provider: method === "MOBILE_MONEY" ? provider : "",
          phone: method === "MOBILE_MONEY" ? phone : "",
          reference: method === "BANK" ? reference : "",
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your payment.");
      setSent(true);
      setBooking((b) => (b.status === "PENDING_PAYMENT" ? { ...b, status: "AWAITING_CONFIRMATION" } : b));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      {/* ------------------------------------------------------------- left */}
      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-400">
                Booking {booking.code}
              </p>
              <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-white">
                {booking.serviceName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {prettyDate(booking.date)} · {labelTime(booking.start)} · {booking.hours} hour
                {booking.hours === 1 ? "" : "s"}
              </p>
            </div>
            <BookingPill status={booking.status} />
          </div>

          {booking.notes && (
            <div className="mt-4 rounded-xl border border-line bg-ink-2 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                Notes for the engineer
              </p>
              <p className="mt-1.5 whitespace-pre-line text-sm text-muted">{booking.notes}</p>
            </div>
          )}

          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <Row label={`Session (${booking.hours} hr)`}>
              {formatMoney(booking.totalCents, currency, currencySymbol)}
            </Row>
            <Row label={`Deposit (${booking.depositPercent}%)`}>
              <span className={confirmed ? "text-emerald-300" : "text-violet-300"}>
                {formatMoney(booking.depositCents, currency, currencySymbol)}
                {confirmed ? " · paid" : ""}
              </span>
            </Row>
            <Row label="Balance">
              {booking.balancePaidAt ? (
                <span className="text-emerald-300">
                  {formatMoney(booking.balanceCents, currency, currencySymbol)} · paid
                </span>
              ) : (
                formatMoney(booking.balanceCents, currency, currencySymbol)
              )}
            </Row>
          </dl>

          <p className="mt-4 text-[11px] text-muted-2">Booked {formatDateTime(booking.createdAt)}</p>
        </div>

        {booking.status === "PENDING_PAYMENT" && (
          <div className="card p-5">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">
              Pay the {formatMoney(booking.depositCents, currency, currencySymbol)} deposit
            </h3>
            <p className="mt-1.5 text-xs text-muted">
              Your slot is held but not locked in until the deposit clears.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ right */}
      <div className="card p-5">
        {booking.status === "CANCELLED" ? (
          <div>
            <h3 className="text-base font-bold text-white">Booking cancelled</h3>
            <p className="mt-2 text-sm text-muted">
              This slot was released. You can pick another time from the calendar.
            </p>
            <Link href="/studio" className="btn btn-primary mt-4 w-full">
              Book another slot
            </Link>
          </div>
        ) : booking.status === "COMPLETED" ? (
          <div>
            <h3 className="text-base font-bold text-white">Session complete ✅</h3>
            <p className="mt-2 text-sm text-muted">
              Thanks for recording with us — hope the session was everything you wanted.
            </p>
            <Link href="/studio" className="btn btn-primary mt-4 w-full">
              Book another session
            </Link>
          </div>
        ) : amountDue > 0 ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">
                {payingBalance ? "Balance due" : "Deposit due"}
              </p>
              <p className="text-3xl font-black tracking-tight text-white">
                {formatMoney(amountDue, currency, currencySymbol)}
              </p>
              <p className="mt-1 text-[11px] text-muted-2">
                {payingBalance
                  ? "Pay now, or settle at the studio before the session starts."
                  : `${booking.depositPercent}% of ${formatMoney(booking.totalCents, currency, currencySymbol)} — the rest is due at the studio.`}
              </p>
            </div>

            <div>
              <p className="label mb-1.5">Pay with</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <MethodButton
                  active={method === "MOBILE_MONEY"}
                  onClick={() => setMethod("MOBILE_MONEY")}
                  title="Mobile money"
                  hint="Instant prompt"
                />
                <MethodButton
                  active={method === "BANK"}
                  onClick={() => setMethod("BANK")}
                  title="Bank transfer"
                  hint="Confirmed by the studio"
                />
              </div>
            </div>

            {method === "MOBILE_MONEY" ? (
              <div className="space-y-3">
                <div>
                  <label className="label" htmlFor="bk-provider">
                    Network
                  </label>
                  <select
                    id="bk-provider"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="input"
                  >
                    {momoAccounts.map((a) => (
                      <option key={a.provider} value={a.provider}>
                        {a.provider} — {a.number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="bk-phone">
                    Mobile money number
                  </label>
                  <input
                    id="bk-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="024 000 0000"
                    className="input"
                    inputMode="tel"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-ink-2 p-3 text-xs text-muted">
                  <p className="font-semibold text-white">{bankAccount.accountName}</p>
                  <p>
                    {bankAccount.bankName} · {bankAccount.accountNumber}
                  </p>
                  {bankAccount.swift && <p>SWIFT: {bankAccount.swift}</p>}
                </div>
                <div>
                  <label className="label" htmlFor="bk-ref">
                    Transfer reference
                  </label>
                  <input
                    id="bk-ref"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={payReference}
                    className="input font-mono"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="bk-note">
                    Note (optional)
                  </label>
                  <input
                    id="bk-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input"
                    placeholder="Anything we should match the transfer to"
                  />
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
              {busy ? (
                <>
                  <Spinner /> Sending…
                </>
              ) : (
                `Send ${formatMoney(amountDue, currency, currencySymbol)}`
              )}
            </button>

            {sent && (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                {method === "MOBILE_MONEY"
                  ? "Approve the prompt on your phone — we confirm the deposit as soon as it lands."
                  : `Transfer recorded. Use ${payReference} as the reference so we can match it.`}
              </p>
            )}

            <p className="text-[11px] leading-relaxed text-muted-2">{paymentInstructions}</p>
          </form>
        ) : (
          <div>
            <h3 className="text-base font-bold text-white">
              {balanceDue === 0 && booking.balancePaidAt ? "Paid in full ✅" : "Deposit received ✅"}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {booking.balancePaidAt
                ? "Nothing left to pay. See you at the studio."
                : `Your slot is confirmed. The balance of ${formatMoney(
                    booking.balanceCents,
                    currency,
                    currencySymbol,
                  )} is payable at the studio before the session starts.`}
            </p>
            <div className="mt-4 rounded-xl border border-line bg-ink-2 p-3 text-[11px] leading-relaxed text-muted-2">
              {policy}
            </div>
            {waiting && (
              <p className="mt-3 text-[11px] text-muted-2">
                Waiting for the studio to confirm your payment…
              </p>
            )}
            <Link href="/studio" className="btn btn-ghost mt-4 w-full text-xs">
              Book another session
            </Link>
          </div>
        )}

        <Link href="/account?tab=bookings" className="mt-4 block text-center text-[11px] text-muted-2 hover:text-white">
          See all my bookings
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="font-semibold text-white">{children}</dd>
    </div>
  );
}

function MethodButton({
  active,
  onClick,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-all ${
        active ? "border-brand bg-brand/10" : "border-line bg-ink-2 hover:border-line-2"
      }`}
    >
      <span className="block text-xs font-bold text-white">{title}</span>
      <span className="block text-[11px] text-muted-2">{hint}</span>
    </button>
  );
}

export function BookingPill({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { label: string; cls: string }> = {
    PENDING_PAYMENT: { label: "Deposit due", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    AWAITING_CONFIRMATION: { label: "Payment sent", cls: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
    CONFIRMED: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
    COMPLETED: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
    CANCELLED: { label: "Cancelled", cls: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
  };
  const item = map[status] ?? map.PENDING_PAYMENT;
  return <span className={`badge border ${item.cls}`}>{item.label}</span>;
}

export function bookingTitle(serviceName: string, date: string, start: string, hours: number) {
  return bookingSummary(serviceName, date, start, hours);
}
