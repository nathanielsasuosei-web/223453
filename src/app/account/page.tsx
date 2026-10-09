import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { beatById, bookingsForUser, db, licenseById, messagesForUser, ordersForUser } from "@/lib/store";
import { AccountMessages } from "@/components/AccountMessages";
import { BookingPill } from "@/components/BookingCheckout";
import { StatusPill } from "@/components/CheckoutClient";
import { Badge, Stat } from "@/components/ui";
import { formatDateTime, formatMoney, timeAgo } from "@/lib/format";
import { labelTime, prettyDate } from "@/lib/studio";
import { artworkUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false },
};

const TABS = [
  { id: "overview", label: "Overview", href: "/account" },
  { id: "orders", label: "Orders & downloads", href: "/account?tab=orders" },
  { id: "bookings", label: "Studio bookings", href: "/account?tab=bookings" },
  { id: "messages", label: "Messages", href: "/account?tab=messages" },
  { id: "profile", label: "Profile", href: "/account?tab=profile" },
];

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "overview";
  const current = await requireUser();
  const user = current.user;
  const data = db();
  const settings = data.settings;
  const orders = ordersForUser(user.id);
  const bookings = bookingsForUser(user.id);
  const messages = messagesForUser(user.id);
  const downloads = data.downloads.filter((d) => d.userId === user.id);
  const spent = orders
    .filter((o) => o.status === "PAID" || o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.amountCents, 0);
  const active = orders.filter((o) => o.status === "PENDING" || o.status === "AWAITING_CONFIRMATION");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400">Artist account</p>
          <h1 className="mt-1.5 text-3xl font-black tracking-tight text-white">
            Hey {user.name.split(" ")[0]} 👋
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Your orders, downloads and messages with the studio — all in one place.
          </p>
        </div>
        <Link href="/beats" className="btn btn-primary text-xs">
          Browse new beats
        </Link>
      </div>

      {params.error === "admin-only" && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          That area is for the producer&apos;s admin account only.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TABS.map((t) => {
            const active = tab === t.id || (t.id === "overview" && !params.tab);
            return (
              <Link
                key={t.id}
                href={t.href}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-gradient-to-r from-brand/25 to-brand-2/10 text-white"
                    : "text-muted hover:bg-panel hover:text-white"
                }`}
              >
                {t.label}
                {t.id === "messages" && messages.some((m) => m.status === "NEW") && (
                  <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === "messages" ? (
            <AccountMessages
              messages={messages.map((m) => ({
                id: m.id,
                subject: m.subject,
                body: m.body,
                status: m.status,
                createdAt: m.createdAt,
                replies: m.replies.map((r) => ({ ...r })),
              }))}
            />
          ) : tab === "orders" ? (
            <OrdersTable
              orders={orders.map((o) => {
                const beat = beatById(o.beatId);
                return {
                  id: o.id,
                  code: o.code,
                  status: o.status,
                  amountCents: o.amountCents,
                  currency: o.currency,
                  method: o.method,
                  createdAt: o.createdAt,
                  beatTitle: beat?.title ?? "Beat removed",
                  beatSlug: beat?.slug ?? "",
                  artwork: beat ? artworkUrl(beat) : "",
                  licenseName: licenseById(o.licenseId)?.name ?? "—",
                  downloadToken: data.downloads.find((d) => d.orderId === o.id)?.token ?? null,
                };
              })}
              currencySymbol={settings.currencySymbol}
            />
          ) : tab === "bookings" ? (
            <BookingsTable
              bookings={bookings.map((b) => ({
                id: b.id,
                code: b.code,
                status: b.status,
                serviceName: b.serviceName,
                date: b.date,
                start: b.start,
                hours: b.hours,
                totalCents: b.totalCents,
                depositCents: b.depositCents,
                balanceCents: b.balanceCents,
                balancePaidAt: b.balancePaidAt,
                currency: b.currency,
              }))}
              currencySymbol={settings.currencySymbol}
            />
          ) : tab === "profile" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="card p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Your details</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3 border-b border-line pb-2.5">
                    <dt className="text-muted-2">Name</dt>
                    <dd className="font-semibold text-white">{user.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-2.5">
                    <dt className="text-muted-2">Email</dt>
                    <dd className="font-semibold text-white">{user.email}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-b border-line pb-2.5">
                    <dt className="text-muted-2">Phone</dt>
                    <dd className="font-semibold text-white">{user.phone || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-2">Member since</dt>
                    <dd className="font-semibold text-white">{formatDateTime(user.createdAt)}</dd>
                  </div>
                </dl>
                <p className="mt-5 text-xs text-muted-2">
                  Need to change your email or phone? Send the studio a message and we&apos;ll update your
                  account.
                </p>
                <Link href="/account?tab=messages" className="btn btn-ghost mt-3 text-xs">
                  Contact the studio
                </Link>
              </div>

              <div className="card p-6">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">
                  Payment lines
                </h2>
                <div className="mt-4 space-y-3">
                  {settings.momoAccounts.map((a) => (
                    <div key={a.number} className="rounded-xl border border-line bg-ink-2 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{a.provider}</p>
                      <p className="font-mono text-xs text-emerald-300">{a.number}</p>
                    </div>
                  ))}
                  <div className="rounded-xl border border-line bg-ink-2 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{settings.bankAccount.bankName}</p>
                    <p className="font-mono text-xs text-sky-300">{settings.bankAccount.accountNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Orders placed" value={String(orders.length)} hint={`${active.length} in progress`} />
                <Stat
                  label="Total spent"
                  value={formatMoney(spent, settings.currency, settings.currencySymbol)}
                />
                <Stat
                  label="Downloads"
                  value={String(downloads.reduce((s, d) => s + d.count, 0))}
                  hint="files pulled"
                />
              </div>

              {active.length > 0 && (
                <div className="card border-amber-500/30 bg-amber-500/5 p-5">
                  <h2 className="text-sm font-bold text-white">Finish your pending order</h2>
                  <div className="mt-3 space-y-2">
                    {active.map((o) => (
                      <Link
                        key={o.id}
                        href={`/checkout/${o.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3 transition-colors hover:border-brand/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {beatById(o.beatId)?.title ?? "Beat"}
                          </p>
                          <p className="text-xs text-muted-2">
                            {o.code} · {timeAgo(o.createdAt)}
                          </p>
                        </div>
                        <span className="btn btn-ghost shrink-0 text-xs">Complete payment</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {bookings.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                    <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">
                      Upcoming studio sessions
                    </h2>
                    <Link href="/account?tab=bookings" className="link text-xs font-semibold">
                      View all
                    </Link>
                  </div>
                  <ul className="divide-y divide-line">
                    {bookings.slice(0, 3).map((b) => (
                      <li key={b.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{b.serviceName}</p>
                          <p className="text-xs text-muted-2">
                            {prettyDate(b.date)} · {labelTime(b.start)} · {b.hours} hr
                            {b.hours === 1 ? "" : "s"} · {b.code}
                          </p>
                        </div>
                        <BookingPill status={b.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Recent orders</h2>
                  <Link href="/account?tab=orders" className="link text-xs font-semibold">
                    View all
                  </Link>
                </div>
                {orders.length ? (
                  <ul className="divide-y divide-line">
                    {orders.slice(0, 5).map((o) => {
                      const beat = beatById(o.beatId);
                      return (
                        <li key={o.id} className="flex items-center gap-4 px-5 py-4">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
                            {beat?.artwork ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={artworkUrl(beat)} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">
                              {beat?.title ?? "Beat removed"}
                            </p>
                            <p className="text-xs text-muted-2">
                              {o.code} · {licenseById(o.licenseId)?.name ?? "—"} ·{" "}
                              {formatMoney(o.amountCents, o.currency, settings.currencySymbol)}
                            </p>
                          </div>
                          <StatusPill status={o.status} />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="px-5 py-10 text-center">
                    <p className="text-sm text-muted">No orders yet.</p>
                    <Link href="/beats" className="btn btn-primary mt-4 text-xs">
                      Find your first beat
                    </Link>
                  </div>
                )}
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Messages</h2>
                  <Link href="/account?tab=messages" className="link text-xs font-semibold">
                    Open inbox
                  </Link>
                </div>
                {messages.length ? (
                  <ul className="mt-3 divide-y divide-line">
                    {messages.slice(0, 3).map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{m.subject}</p>
                          <p className="text-xs text-muted-2">
                            {m.replies.length
                              ? `${m.replies.length} repl${m.replies.length === 1 ? "y" : "ies"}`
                              : "Awaiting reply"}{" "}
                            · {timeAgo(m.createdAt)}
                          </p>
                        </div>
                        <Badge tone={m.status === "NEW" ? "amber" : m.status === "REPLIED" ? "green" : "slate"}>
                          {m.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted">
                    No messages yet.{" "}
                    <Link href="/contact" className="link">
                      Start a conversation
                    </Link>
                    .
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BookingsTable({
  bookings,
  currencySymbol,
}: {
  bookings: {
    id: string;
    code: string;
    status: "PENDING_PAYMENT" | "AWAITING_CONFIRMATION" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
    serviceName: string;
    date: string;
    start: string;
    hours: number;
    totalCents: number;
    depositCents: number;
    balanceCents: number;
    balancePaidAt: string | null;
    currency: string;
  }[];
  currencySymbol: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Studio bookings</h2>
        <p className="mt-1 text-xs text-muted-2">
          Sessions you&apos;ve booked. Deposits lock the slot, the balance is due at the studio.
        </p>
      </div>
      {bookings.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                <th className="px-5 py-3 font-semibold">Session</th>
                <th className="px-5 py-3 font-semibold">When</th>
                <th className="px-5 py-3 font-semibold">Total</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookings.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-panel/40">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{b.serviceName}</p>
                    <p className="font-mono text-xs text-muted-2">{b.code}</p>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {prettyDate(b.date)}
                    <br />
                    <span className="text-xs text-muted-2">
                      {labelTime(b.start)} · {b.hours} hr{b.hours === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-white">
                    {formatMoney(b.totalCents, b.currency, currencySymbol)}
                    <br />
                    <span className="text-xs font-normal text-muted-2">
                      {b.balancePaidAt
                        ? "paid in full"
                        : `deposit ${formatMoney(b.depositCents, b.currency, currencySymbol)}`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <BookingPill status={b.status} />
                  </td>
                  <td className="px-5 py-4">
                    {b.status === "CANCELLED" || b.status === "COMPLETED" ? (
                      <span className="text-xs text-muted-2">Closed</span>
                    ) : (
                      <Link href={`/booking/${b.id}`} className="btn btn-primary text-xs">
                        {b.status === "CONFIRMED" && !b.balancePaidAt
                          ? "Pay balance"
                          : b.status === "AWAITING_CONFIRMATION"
                            ? "View status"
                            : "Pay deposit"}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-muted">You haven&apos;t booked studio time yet.</p>
          <Link href="/studio" className="btn btn-primary mt-4 text-xs">
            Book a session
          </Link>
        </div>
      )}
    </div>
  );
}

function OrdersTable({
  orders,
  currencySymbol,
}: {
  orders: {
    id: string;
    code: string;
    status: "PENDING" | "AWAITING_CONFIRMATION" | "PAID" | "DELIVERED" | "CANCELLED";
    amountCents: number;
    currency: string;
    method: "MOBILE_MONEY" | "BANK" | "CARD" | null;
    createdAt: string;
    beatTitle: string;
    beatSlug: string;
    artwork: string;
    licenseName: string;
    downloadToken: string | null;
  }[];
  currencySymbol: string;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Orders & downloads</h2>
        <p className="mt-1 text-xs text-muted-2">
          Download links never expire. Files are also attached to your confirmation email.
        </p>
      </div>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                <th className="px-5 py-3 font-semibold">Beat</th>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">License</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-panel/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
                        {o.artwork ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.artwork} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{o.beatTitle}</p>
                        <p className="text-xs text-muted-2">{formatDateTime(o.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-muted">{o.code}</td>
                  <td className="px-5 py-4 text-muted">{o.licenseName}</td>
                  <td className="px-5 py-4 font-semibold text-white">
                    {formatMoney(o.amountCents, o.currency, currencySymbol)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill status={o.status} />
                  </td>
                  <td className="px-5 py-4">
                    {o.status === "DELIVERED" || o.status === "PAID" ? (
                      o.downloadToken ? (
                        <Link href={`/download/${o.downloadToken}`} className="btn btn-ghost text-xs">
                          Download
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-2">Emailed</span>
                      )
                    ) : o.status === "CANCELLED" ? (
                      <span className="text-xs text-muted-2">Closed</span>
                    ) : (
                      <Link href={`/checkout/${o.id}`} className="btn btn-primary text-xs">
                        {o.status === "AWAITING_CONFIRMATION" ? "View status" : "Pay now"}
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-muted">You haven&apos;t ordered any beats yet.</p>
          <Link href="/beats" className="btn btn-primary mt-4 text-xs">
            Browse the beat store
          </Link>
        </div>
      )}
    </div>
  );
}
