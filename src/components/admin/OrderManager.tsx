"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { Spinner } from "../ui";

type Status = "PENDING" | "AWAITING_CONFIRMATION" | "PAID" | "DELIVERED" | "CANCELLED";

interface Payment {
  id: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD";
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
  proofUrl: string;
}

interface Order {
  id: string;
  code: string;
  status: Status;
  amountCents: number;
  currency: string;
  method: "MOBILE_MONEY" | "BANK" | "CARD" | null;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  userName: string;
  userEmail: string;
  beatTitle: string;
  beatSlug: string;
  licenseName: string;
  plan: "FULL" | "HALF";
  depositCents: number;
  balanceCents: number;
  balancePaidAt: string | null;
  payments: Payment[];
}

const FILTERS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "AWAITING_CONFIRMATION", label: "Awaiting confirmation" },
  { id: "PENDING", label: "Awaiting payment" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function OrderManager({
  orders: initialOrders,
  counts,
  filter,
  currencySymbol,
}: {
  orders: Order[];
  counts: Record<string, number>;
  filter: string;
  currencySymbol: string;
}) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | null>(initialOrders[0]?.id ?? null);

  async function confirm(order: Order, payment: Payment) {
    setBusyId(payment.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not confirm the payment.");
      setNotice(
        `${order.code} confirmed — the beat was emailed to ${data.emailedTo ?? order.userEmail} with a private download link.`,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "DELIVERED",
                deliveredAt: new Date().toISOString(),
                paidAt: new Date().toISOString(),
                payments: o.payments.map((p) =>
                  p.id === payment.id
                    ? { ...p, status: "CONFIRMED", confirmedAt: new Date().toISOString() }
                    : p,
                ),
              }
            : o,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function markBalancePaid(order: Order) {
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/balance`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not settle the balance.");
      setNotice(
        `${order.code} balance settled — the files were emailed to ${data.emailedTo ?? order.userEmail}.`,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "DELIVERED",
                balancePaidAt: new Date().toISOString(),
                deliveredAt: new Date().toISOString(),
              }
            : o,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function releaseFiles(order: Order) {
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliver`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not release the files.");
      setNotice(`${order.code} delivered — files emailed to ${data.emailedTo ?? order.userEmail}.`);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "DELIVERED", deliveredAt: new Date().toISOString() }
            : o,
        ),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function cancel(order: Order) {
    const reason = window.prompt(
      `Cancel ${order.code}? Add a short reason for the artist (optional).`,
      "No payment was received within 24 hours.",
    );
    if (reason === null) return;
    setBusyId(order.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not cancel the order.");
      setOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? {
                ...o,
                status: "CANCELLED",
                payments: o.payments.map((p) => (p.status === "PENDING" ? { ...p, status: "FAILED" } : p)),
              }
            : o,
        ),
      );
      setNotice(`${order.code} cancelled and the artist was emailed.`);
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
        <h2 className="text-lg font-bold text-white">Orders & payments</h2>
        <p className="mt-1 text-xs text-muted">
          Confirm a payment and the beat files are emailed to the artist instantly, with a permanent
          private download link.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Link
              key={f.id}
              href={f.id === "ALL" ? "/admin/orders" : `/admin/orders?status=${f.id}`}
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

      {orders.length === 0 && (
        <p className="card px-5 py-10 text-center text-sm text-muted">
          No orders in this view yet.
        </p>
      )}

      <div className="space-y-4">
        {orders.map((order) => {
          const open = openId === order.id;
          const pendingPayment = order.payments.find((p) => p.status === "PENDING");
          return (
            <div key={order.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : order.id)}
                className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-panel/40"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-white">{order.code}</span>
                    <StatusPill status={order.status} />
                    {pendingPayment && (
                      <span className="badge bg-amber-500/15 text-amber-300">Payment to verify</span>
                    )}
                    {order.plan === "HALF" && (
                      <span className="badge bg-violet-500/15 text-violet-300">
                        {order.balancePaidAt
                          ? "50/50 settled"
                          : order.paidAt
                            ? `Balance ${formatMoney(order.balanceCents, order.currency, currencySymbol)}`
                            : "Paying 50% now"}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">
                    <span className="font-semibold text-white">{order.userName}</span> · {order.userEmail} ·{" "}
                    {order.beatTitle} ({order.licenseName})
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tracking-tight text-white">
                    {formatMoney(order.amountCents, order.currency, currencySymbol)}
                  </p>
                  <p className="text-xs text-muted-2">{timeAgo(order.createdAt)}</p>
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
                    <Detail label="Artist" value={`${order.userName} (${order.userEmail})`} />
                    <Detail label="Beat" value={`${order.beatTitle} — ${order.licenseName}`} />
                    <Detail
                      label="Payment method"
                      value={
                        order.method === "MOBILE_MONEY"
                          ? "Mobile money"
                          : order.method === "BANK"
                            ? "Bank transfer"
                            : "—"
                      }
                    />
                    <Detail label="Placed" value={formatDateTime(order.createdAt)} />
                    {order.plan === "HALF" && (
                      <>
                        <Detail label="Payment plan" value="50% deposit + 50% before delivery" />
                        <Detail
                          label="Deposit"
                          value={`${formatMoney(order.depositCents, order.currency, currencySymbol)}${order.paidAt ? " · paid" : " · outstanding"}`}
                        />
                        <Detail
                          label="Balance"
                          value={`${formatMoney(order.balanceCents, order.currency, currencySymbol)}${order.balancePaidAt ? " · paid" : " · outstanding"}`}
                        />
                      </>
                    )}
                    {order.paidAt && <Detail label="Paid" value={formatDateTime(order.paidAt)} />}
                    {order.deliveredAt && (
                      <Detail label="Delivered" value={formatDateTime(order.deliveredAt)} />
                    )}
                  </dl>

                  <div className="mt-4 space-y-3">
                    {order.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="rounded-xl border border-line bg-ink-2 px-4 py-3.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
  <p className="text-sm font-bold text-white">
                              {payment.method === "MOBILE_MONEY" ? "📲 Mobile money" : "🏦 Bank transfer"}
                              {payment.provider ? ` · ${payment.provider}` : ""}
                              {payment.kind === "BALANCE" ? " · balance" : payment.kind === "DEPOSIT" ? " · deposit" : ""}
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
                            value={formatMoney(payment.amountCents, order.currency, currencySymbol)}
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
                              onClick={() => confirm(order, payment)}
                              disabled={busyId === payment.id}
                              className="btn btn-primary text-xs"
                            >
                              {busyId === payment.id ? (
                                <>
                                  <Spinner /> Confirming…
                                </>
                              ) : (
                                "Confirm payment & email files"
                              )}
                            </button>
                            <button
                              onClick={() => cancel(order)}
                              disabled={busyId === order.id}
                              className="btn btn-danger text-xs"
                            >
                              Cancel order
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {order.payments.length === 0 && (
                      <p className="text-sm text-muted">
                        No payment submitted yet — the artist is still on the checkout page.
                      </p>
                    )}

                    {order.plan === "HALF" && !order.balancePaidAt && order.status !== "CANCELLED" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => markBalancePaid(order)}
                          disabled={busyId === order.id}
                          className="btn btn-ghost text-xs"
                        >
                          {busyId === order.id ? (
                            <>
                              <Spinner /> Settling…
                            </>
                          ) : (
                            `Mark balance paid (${formatMoney(order.balanceCents, order.currency, currencySymbol)})`
                          )}
                        </button>
                        {order.paidAt && (
                          <button
                            onClick={() => releaseFiles(order)}
                            disabled={busyId === order.id}
                            className="btn btn-ghost text-xs"
                          >
                            Release files early
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {order.beatSlug && (
                    <Link
                      href={`/beats/${order.beatSlug}`}
                      className="link mt-4 inline-block text-xs font-semibold"
                    >
                      View beat page →
                    </Link>
                  )}
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
    PENDING: "bg-amber-500/15 text-amber-300",
    AWAITING_CONFIRMATION: "bg-sky-500/15 text-sky-300",
    PAID: "bg-emerald-500/15 text-emerald-300",
    DELIVERED: "bg-emerald-500/15 text-emerald-300",
    CANCELLED: "bg-rose-500/15 text-rose-300",
  };
  const label = status.replace("_", " ").toLowerCase();
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
