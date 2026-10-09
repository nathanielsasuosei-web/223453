"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { Spinner } from "./ui";

type BookingStatus =
  | "PENDING_DEPOSIT"
  | "AWAITING_DEPOSIT"
  | "DEPOSIT_PAID"
  | "AWAITING_BALANCE"
  | "PAID"
  | "CANCELLED";

interface BookingData {
  id: string;
  code: string;
  status: BookingStatus;
  service: string;
  sessionDate: string;
  sessionTime: string;
  priceCents: number;
  depositCents: number;
  balanceCents: number;
  currency: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD" | null;
  createdAt: string;
  reference: string;
  phone: string;
  note: string;
  depositPaidAt: string | null;
  paidAt: string | null;
}

interface Due {
  amountCents: number;
  purpose: "SESSION_DEPOSIT" | "SESSION_BALANCE";
}

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

export function BookingClient({
  booking,
  due: initialDue,
  currency,
  currencySymbol,
  depositPercent,
  momoAccounts,
  bankAccount,
  paymentInstructions,
}: {
  booking: BookingData;
  due: Due | null;
  currency: string;
  currencySymbol: string;
  depositPercent: number;
  momoAccounts: MomoAccount[];
  bankAccount: BankAccount;
  paymentInstructions: string;
}) {
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [due, setDue] = useState<Due | null>(initialDue);
  const [method, setMethod] = useState<"MOBILE_MONEY" | "BANK">(booking.method === "BANK" ? "BANK" : "MOBILE_MONEY");
  const [provider, setProvider] = useState(momoAccounts[0]?.provider ?? "MTN Mobile Money");
  const [phone, setPhone] = useState(booking.phone);
  const [bankReference, setBankReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const awaiting = status === "AWAITING_DEPOSIT" || status === "AWAITING_BALANCE";
  const paid = status === "PAID";
  const depositPaid = status === "DEPOSIT_PAID";
  const what = due?.purpose === "SESSION_BALANCE" ? "balance" : "deposit";
  const amount = formatMoney(due?.amountCents ?? 0, currency, currencySymbol);

  /* poll booking status while waiting for the studio to confirm */
  useEffect(() => {
    if (!awaiting) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/bookings/${booking.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setStatus(data.booking.status);
        setDue(data.booking.due ?? null);
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
  }, [awaiting, booking.id]);

  async function submitMobileMoney(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/bookings/${booking.id}/pay/mobile-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your payment.");
      setStatus(due?.purpose === "SESSION_BALANCE" ? "AWAITING_BALANCE" : "AWAITING_DEPOSIT");
      setDue(null);
      setInfo("Payment instructions are on their way to your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function submitBank(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const body = new FormData();
      body.set("reference", bankReference);
      body.set("note", note);
      if (proof) body.set("proof", proof);
      const res = await fetch(`/api/bookings/${booking.id}/pay/bank`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your transfer.");
      setStatus(due?.purpose === "SESSION_BALANCE" ? "AWAITING_BALANCE" : "AWAITING_DEPOSIT");
      setDue(null);
      setInfo("Transfer logged. The studio will confirm it shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- fully paid */
  if (paid) {
    return (
      <div className="space-y-6">
        <StatusBanner tone="green" title="Fully paid — see you at the studio 🎶" />
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">You're all set!</h1>
          <p className="mt-2 text-sm text-muted">
            Your <strong className="text-white">{booking.service}</strong> session on{" "}
            <strong className="text-white">{formatDate(booking.sessionDate)}</strong> at{" "}
            <strong className="text-white">{booking.sessionTime}</strong> is paid in full. A confirmation
            is in your inbox — see you at the studio.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/account?tab=sessions" className="btn btn-primary">
              View my sessions
            </Link>
            <Link href="/book" className="btn btn-ghost">
              Book another session
            </Link>
          </div>
        </div>
        <BookingSummary booking={booking} currency={currency} currencySymbol={currencySymbol} depositPercent={depositPercent} />
      </div>
    );
  }

  /* -------------------------------------------------------------- cancelled */
  if (status === "CANCELLED") {
    return (
      <div className="space-y-6">
        <StatusBanner tone="rose" title="This booking was cancelled" />
        <div className="card p-8 text-center">
          <h1 className="text-xl font-bold text-white">Booking {booking.code} is closed</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            This session was cancelled. If you already paid a deposit, the studio will arrange a refund —
            reply to your confirmation email.
          </p>
          <Link href="/book" className="btn btn-primary mt-6">
            Book a new session
          </Link>
        </div>
      </div>
    );
  }

  /* --------------------------------------------- awaiting / pay the balance */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        {depositPaid && (
          <div className="card border-emerald-500/30 bg-emerald-500/5 p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <h2 className="text-base font-bold text-white">Deposit received — your slot is secured ✅</h2>
                <p className="mt-1.5 text-sm text-muted">
                  Your {booking.service} session on {formatDate(booking.sessionDate)} at {booking.sessionTime}{" "}
                  is locked in. The remaining balance is due before your session — pay it below any time.
                </p>
              </div>
            </div>
          </div>
        )}

        {awaiting && (
          <div className="card border-amber-500/30 bg-amber-500/5 p-6">
            <div className="flex items-start gap-3">
              <span className="relative mt-1 flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-amber-400" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
              </span>
              <div>
                <h2 className="text-base font-bold text-white">Waiting for payment confirmation</h2>
                <p className="mt-1.5 text-sm text-muted">
                  {method === "BANK"
                    ? "We've logged your transfer and notified the studio. Bank payments are usually confirmed within the hour."
                    : "Complete the prompt on your phone with your PIN. The studio confirms mobile money payments within minutes."}{" "}
                  This page updates automatically the moment your payment clears.
                </p>
                {info && <p className="mt-2 text-xs font-semibold text-emerald-300">{info}</p>}
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-2">
                  <Spinner /> Checking for confirmation…
                </p>
              </div>
            </div>
          </div>
        )}

        {due && !awaiting && (
          <div className="card overflow-hidden">
            <div className="flex border-b border-line">
              {(["MOBILE_MONEY", "BANK"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setMethod(tab);
                    setError("");
                  }}
                  className={`flex-1 px-4 py-4 text-sm font-bold transition-colors ${
                    method === tab
                      ? "bg-panel-2 text-white"
                      : "text-muted hover:bg-panel/60 hover:text-white"
                  }`}
                >
                  {tab === "MOBILE_MONEY" ? "📲 Mobile money" : "🏦 Bank transfer"}
                </button>
              ))}
            </div>

            <div className="p-6">
              {method === "MOBILE_MONEY" ? (
                <form onSubmit={submitMobileMoney} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Pay your {what} with mobile money
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Send {amount} to any line below using your booking code as the reference. Approve the
                      prompt on your phone — that's it.
                    </p>
                  </div>

                  <div className="space-y-2.5">
                    {momoAccounts.map((account) => (
                      <div
                        key={account.number}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{account.provider}</p>
                          <p className="text-xs text-muted-2">{account.name}</p>
                        </div>
                        <p className="font-mono text-sm font-bold text-emerald-300">{account.number}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="provider">
                        You are paying with
                      </label>
                      <select
                        id="provider"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="input"
                      >
                        {[...new Set([...momoAccounts.map((a) => a.provider), "MTN Mobile Money", "Telecel Cash", "AirtelTigo Money", "M-Pesa"])].map(
                          (p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="phone">
                        Your mobile money number
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input"
                        placeholder="+233 55 000 0000"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-line bg-ink-2 p-4 text-xs text-muted">
                    <p className="font-bold text-white">Steps</p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                      <li>Dial your mobile money menu and choose Send Money.</li>
                      <li>
                        Send <strong className="text-white">{amount}</strong> to the number above.
                      </li>
                      <li>
                        Use reference <strong className="text-white">{booking.code}</strong>.
                      </li>
                      <li>Approve the prompt with your PIN, then submit below.</li>
                    </ol>
                  </div>

                  {error && <ErrorNote message={error} />}

                  <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
                    {busy ? (
                      <>
                        <Spinner /> Submitting…
                      </>
                    ) : (
                      `I've sent the ${what} — submit for confirmation`
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitBank} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">Pay your {what} by bank transfer</h2>
                    <p className="mt-1 text-sm text-muted">
                      Transfer {amount} to the studio account and use your booking code as the reference.
                      Upload the transfer receipt if you have it — it speeds up confirmation.
                    </p>
                  </div>

                  <dl className="divide-y divide-line rounded-xl border border-line bg-ink-2 px-4">
                    <DetailRow label="Bank" value={bankAccount.bankName} />
                    <DetailRow label="Account name" value={bankAccount.accountName} />
                    <DetailRow label="Account number" value={bankAccount.accountNumber} mono />
                    {bankAccount.swift && <DetailRow label="SWIFT" value={bankAccount.swift} mono />}
                    {bankAccount.branch && <DetailRow label="Branch" value={bankAccount.branch} />}
                  </dl>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="bankReference">
                        Transfer reference <span className="text-muted-2">(optional)</span>
                      </label>
                      <input
                        id="bankReference"
                        value={bankReference}
                        onChange={(e) => setBankReference(e.target.value)}
                        className="input"
                        placeholder={booking.code}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="proof">
                        Receipt screenshot <span className="text-muted-2">(optional)</span>
                      </label>
                      <input
                        id="proof"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setProof(e.target.files?.[0] ?? null)}
                        className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label" htmlFor="note">
                      Note for the studio <span className="text-muted-2">(optional)</span>
                    </label>
                    <textarea
                      id="note"
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="input resize-y"
                      placeholder="Paid from Fidelity Bank, ref 88412…"
                    />
                  </div>

                  {error && <ErrorNote message={error} />}

                  <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
                    {busy ? (
                      <>
                        <Spinner /> Submitting…
                      </>
                    ) : (
                      `I've made the transfer — submit for confirmation`
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {!due && !awaiting && !depositPaid && (
          <div className="card p-6 text-sm text-muted">
            Nothing is due for this booking right now.
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-2">{paymentInstructions}</p>
      </div>

      <BookingSummary booking={booking} currency={currency} currencySymbol={currencySymbol} depositPercent={depositPercent} />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function BookingSummary({
  booking,
  currency,
  currencySymbol,
  depositPercent,
}: {
  booking: BookingData;
  currency: string;
  currencySymbol: string;
  depositPercent: number;
}) {
  return (
    <aside className="card h-fit overflow-hidden lg:sticky lg:top-24">
      <div className="bg-gradient-to-br from-brand/40 via-panel to-brand-2/30 p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-200">
          Session booking
        </p>
        <p className="mt-1 text-lg font-extrabold leading-tight text-white">{booking.service}</p>
        <p className="mt-1 text-sm font-semibold text-white/80">
          {formatDate(booking.sessionDate)} · {booking.sessionTime}
        </p>
      </div>

      <dl className="space-y-2.5 p-5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Booking</dt>
          <dd className="font-mono font-bold text-white">{booking.code}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Booked</dt>
          <dd className="text-muted">{formatDateTime(booking.createdAt)}</dd>
        </div>
        {booking.phone && (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-2">Phone</dt>
            <dd className="text-muted">{booking.phone}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Status</dt>
          <dd>
            <StatusPill status={booking.status} />
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-line pt-2.5">
          <dt className="text-muted-2">Session price</dt>
          <dd className="font-semibold text-white">
            {formatMoney(booking.priceCents, currency, currencySymbol)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Deposit ({depositPercent}%)</dt>
          <dd className="text-muted">
            {formatMoney(booking.depositCents, currency, currencySymbol)}
            {booking.depositPaidAt ? " · paid" : ""}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Balance</dt>
          <dd className="text-muted">
            {formatMoney(booking.balanceCents, currency, currencySymbol)}
            {booking.paidAt ? " · paid" : ""}
          </dd>
        </div>
      </dl>

      {booking.note && (
        <div className="border-t border-line p-5 text-xs">
          <p className="font-semibold uppercase tracking-[0.14em] text-muted-2">Your note</p>
          <p className="mt-1.5 leading-relaxed text-muted">{booking.note}</p>
        </div>
      )}

      <div className="border-t border-line p-5 text-xs text-muted-2">
        <p className="flex items-start gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-emerald-400">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Your slot is secured the moment the studio confirms your deposit.
        </p>
      </div>
    </aside>
  );
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { label: string; className: string }> = {
    PENDING_DEPOSIT: { label: "Awaiting deposit", className: "bg-amber-500/15 text-amber-300" },
    AWAITING_DEPOSIT: { label: "Confirming deposit", className: "bg-sky-500/15 text-sky-300" },
    DEPOSIT_PAID: { label: "Deposit paid", className: "bg-emerald-500/15 text-emerald-300" },
    AWAITING_BALANCE: { label: "Confirming balance", className: "bg-sky-500/15 text-sky-300" },
    PAID: { label: "Paid in full", className: "bg-emerald-500/15 text-emerald-300" },
    CANCELLED: { label: "Cancelled", className: "bg-rose-500/15 text-rose-300" },
  };
  const tone = map[status];
  return <span className={`badge ${tone.className}`}>{tone.label}</span>;
}

function StatusPill({ status }: { status: BookingStatus }) {
  return <BookingStatusPill status={status} />;
}

function StatusBanner({ tone, title }: { tone: "green" | "rose"; title: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${
        tone === "green"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/30 bg-rose-500/10 text-rose-200"
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10">
        {tone === "green" ? (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        )}
      </span>
      <p className="text-sm font-bold">{title}</p>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-xs text-muted-2">{label}</dt>
      <dd className={`text-sm font-semibold text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
      {message}
    </p>
  );
}
