"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Spinner } from "./ui";

type OrderStatus = "PENDING" | "AWAITING_CONFIRMATION" | "PAID" | "DELIVERED" | "CANCELLED";

interface CheckoutOrder {
  id: string;
  code: string;
  status: OrderStatus;
  amountCents: number;
  currency: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD" | null;
  createdAt: string;
  reference: string;
  /** "HALF" = 50% deposit now, balance before delivery. */
  plan?: "FULL" | "HALF";
  depositCents?: number;
  balanceCents?: number;
  balancePaidAt?: string | null;
  paidAt?: string | null;
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

export function CheckoutClient({
  order,
  beat,
  licenseName,
  currency,
  currencySymbol,
  downloadToken,
  momoAccounts,
  bankAccount,
  paymentInstructions,
  balanceNote,
}: {
  order: CheckoutOrder;
  beat: { title: string; slug: string; genre: string; bpm: number; musicalKey: string; artwork: string };
  licenseName: string;
  currency: string;
  currencySymbol: string;
  downloadToken: string | null;
  momoAccounts: MomoAccount[];
  bankAccount: BankAccount;
  paymentInstructions: string;
  balanceNote?: string;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paidAt, setPaidAt] = useState<string | null>(order.paidAt ?? null);
  const [balancePaidAt, setBalancePaidAt] = useState<string | null>(order.balancePaidAt ?? null);
  const [token, setToken] = useState<string | null>(downloadToken);
  const [method, setMethod] = useState<"MOBILE_MONEY" | "BANK">(order.method === "BANK" ? "BANK" : "MOBILE_MONEY");
  const [provider, setProvider] = useState(momoAccounts[0]?.provider ?? "MTN Mobile Money");
  const [phone, setPhone] = useState("");
  const [bankReference, setBankReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const proofInput = useRef<HTMLInputElement | null>(null);

  const isHalf = order.plan === "HALF" && (order.balanceCents ?? 0) > 0;
  const depositOutstanding = isHalf && !paidAt;
  const balanceOutstanding = isHalf && Boolean(paidAt) && !balancePaidAt;
  const amountDueCents = balanceOutstanding
    ? (order.balanceCents ?? 0)
    : depositOutstanding
      ? (order.depositCents ?? order.amountCents)
      : order.amountCents;
  const amount = formatMoney(amountDueCents, currency, currencySymbol);
  const payReference = balanceOutstanding ? `${order.code}-BAL` : order.code;
  const awaiting = status === "AWAITING_CONFIRMATION";
  const paid = status === "PAID" || status === "DELIVERED";
  const summary = {
    currencySymbol,
    isHalf,
    depositPaid: Boolean(paidAt),
    balancePaid: Boolean(balancePaidAt),
    balanceOutstanding,
    depositOutstanding,
  };

  /* poll order status while waiting for the studio to confirm */
  useEffect(() => {
    if (!awaiting) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${order.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!alive) return;
        setStatus(data.order.status);
        setToken(data.order.downloadToken ?? null);
        if (data.order.paidAt !== undefined) setPaidAt(data.order.paidAt);
        if (data.order.balancePaidAt !== undefined) setBalancePaidAt(data.order.balancePaidAt);
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
  }, [awaiting, order.id]);

  async function submitMobileMoney(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch(`/api/orders/${order.id}/pay/mobile-money`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your payment.");
      setStatus("AWAITING_CONFIRMATION");
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
      const res = await fetch(`/api/orders/${order.id}/pay/bank`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not submit your transfer.");
      setStatus("AWAITING_CONFIRMATION");
      setInfo("Transfer logged. We'll email your files the moment it clears.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------------------------------------- delivered */
  if (paid) {
    return (
      <div className="space-y-6">
        <StatusBanner tone="green" title="Payment confirmed — files delivered 🎉" />
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Enjoy your beat!</h1>
          <p className="mt-2 text-sm text-muted">
            <strong className="text-white">{beat.title}</strong> ({licenseName}) has been emailed to you,
            and your private download page is live. We also attached the files to the email so you always
            have a copy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {token && (
              <Link href={`/download/${token}`} className="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                  <path d="M4 19h16" />
                </svg>
                Download your files
              </Link>
            )}
            <Link href="/account?tab=orders" className="btn btn-ghost">
              View all orders
            </Link>
            <Link href="/beats" className="btn btn-ghost">
              Keep browsing
            </Link>
          </div>
        </div>
        <OrderSummary
          order={order}
          beat={beat}
          licenseName={licenseName}
          amount={amount}
          breakdown={summary}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------ cancelled */
  if (status === "CANCELLED") {
    return (
      <div className="space-y-6">
        <StatusBanner tone="rose" title="This order was cancelled" />
        <div className="card p-8 text-center">
          <h1 className="text-xl font-bold text-white">Order {order.code} is closed</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            The beat is still available unless it was bought exclusively. You can place a fresh order in
            seconds.
          </p>
          <Link href={`/beats/${beat.slug}`} className="btn btn-primary mt-6">
            Order {beat.title} again
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------- awaiting / pending */
  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        {balanceOutstanding && (
          <div className="card border-violet-500/30 bg-violet-500/5 p-6">
            <h2 className="text-base font-bold text-white">
              Deposit received — {formatMoney(order.balanceCents ?? 0, currency, currencySymbol)} balance due
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              You paid half up front. Send the balance with reference{" "}
              <strong className="font-mono text-white">{payReference}</strong> and the files are released the
              moment it clears.
            </p>
            {balanceNote && <p className="mt-2 text-xs text-muted-2">{balanceNote}</p>}
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
                  This page updates automatically, and your files are emailed the second it clears.
                </p>
                {info && <p className="mt-2 text-xs font-semibold text-emerald-300">{info}</p>}
                <p className="mt-3 flex items-center gap-2 text-xs text-muted-2">
                  <Spinner /> Checking for confirmation…
                </p>
              </div>
            </div>
          </div>
        )}

        {!awaiting && (
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
                      {balanceOutstanding ? "Pay the balance with mobile money" : "Pay with mobile money"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Send {amount} to any line below using{" "}
                      <strong className="font-mono text-white">{payReference}</strong> as the reference.
                      Approve the prompt on your phone — that's it.
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
                        Use reference <strong className="text-white">{payReference}</strong>.
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
                      "I've sent the payment — submit for confirmation"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={submitBank} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {balanceOutstanding ? "Pay the balance by bank transfer" : "Pay by bank transfer"}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Transfer {amount} to the studio account and use{" "}
                      <strong className="font-mono text-white">{payReference}</strong> as the reference.
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
                        placeholder={payReference}
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="proof">
                        Receipt screenshot <span className="text-muted-2">(optional)</span>
                      </label>
                      <input
                        id="proof"
                        ref={proofInput}
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
                      "I've made the transfer — submit for confirmation"
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-2">{paymentInstructions}</p>
      </div>

      <OrderSummary
        order={order}
        beat={beat}
        licenseName={licenseName}
        amount={amount}
        breakdown={summary}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function OrderSummary({
  order,
  beat,
  licenseName,
  amount,
  breakdown,
}: {
  order: CheckoutOrder;
  beat: { title: string; slug: string; artwork: string };
  licenseName: string;
  amount: string;
  breakdown?: {
    currencySymbol: string;
    isHalf: boolean;
    depositPaid: boolean;
    balancePaid: boolean;
    balanceOutstanding: boolean;
    depositOutstanding: boolean;
  };
}) {
  return (
    <aside className="card h-fit overflow-hidden lg:sticky lg:top-24">
      <div className="relative aspect-video">
        {beat.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={beat.artwork} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand/40 via-panel to-brand-2/30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">
            {licenseName}
          </p>
          <p className="text-lg font-extrabold leading-tight text-white">{beat.title}</p>
        </div>
      </div>

      <dl className="space-y-2.5 p-5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Order</dt>
          <dd className="font-mono font-bold text-white">{order.code}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Placed</dt>
          <dd className="text-muted">{formatDateTime(order.createdAt)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Payment</dt>
          <dd className="text-muted">
            {order.method === "BANK" ? "Bank transfer" : order.method === "MOBILE_MONEY" ? "Mobile money" : "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-2">Status</dt>
          <dd>
            <StatusPill status={order.status} />
          </dd>
        </div>
        {breakdown?.isHalf && (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-2">Licence total</dt>
              <dd className="text-muted">
                {formatMoney(order.amountCents, order.currency, breakdown.currencySymbol)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-2">Deposit (50%)</dt>
              <dd className={breakdown.depositPaid ? "text-emerald-300" : "text-muted"}>
                {formatMoney(order.depositCents ?? 0, order.currency, breakdown.currencySymbol)}
                {breakdown.depositPaid ? " · paid" : ""}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-2">Balance</dt>
              <dd className={breakdown.balancePaid ? "text-emerald-300" : "text-muted"}>
                {formatMoney(order.balanceCents ?? 0, order.currency, breakdown.currencySymbol)}
                {breakdown.balancePaid ? " · paid" : ""}
              </dd>
            </div>
          </>
        )}
        <div className="flex items-end justify-between gap-3 border-t border-line pt-3">
          <dt className="text-sm font-semibold text-white">
            {breakdown?.balanceOutstanding
              ? "Balance due"
              : breakdown?.depositOutstanding
                ? "Deposit due now"
                : "Total due"}
          </dt>
          <dd className="text-2xl font-black tracking-tight text-white">{amount}</dd>
        </div>
      </dl>

      <div className="border-t border-line p-5 text-xs text-muted-2">
        <p className="flex items-start gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-emerald-400">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Files are emailed to you the moment payment is confirmed — no extra step needed.
        </p>
      </div>
    </aside>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; className: string }> = {
    PENDING: { label: "Awaiting payment", className: "bg-amber-500/15 text-amber-300" },
    AWAITING_CONFIRMATION: { label: "Confirming", className: "bg-sky-500/15 text-sky-300" },
    PAID: { label: "Paid", className: "bg-emerald-500/15 text-emerald-300" },
    DELIVERED: { label: "Delivered", className: "bg-emerald-500/15 text-emerald-300" },
    CANCELLED: { label: "Cancelled", className: "bg-rose-500/15 text-rose-300" },
  };
  const tone = map[status];
  return <span className={`badge ${tone.className}`}>{tone.label}</span>;
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
