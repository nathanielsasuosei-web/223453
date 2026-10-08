import type { Metadata } from "next";
import Link from "next/link";
import { beatById, db, licenseById } from "@/lib/store";
import { Stat } from "@/components/ui";
import { formatCount, formatMoney, timeAgo } from "@/lib/format";
import { artworkUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboard() {
  const data = db();
  const settings = data.settings;
  const paid = data.orders.filter((o) => o.status === "PAID" || o.status === "DELIVERED");
  const revenue = paid.reduce((sum, o) => sum + o.amountCents, 0);
  const pendingPayments = data.payments.filter((p) => p.status === "PENDING");
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amountCents, 0);
  const artists = data.users.filter((u) => u.role === "ARTIST");
  const plays = data.beats.reduce((sum, b) => sum + b.plays, 0);
  const newMessages = data.messages.filter((m) => m.status === "NEW");

  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const week = Array.from({ length: 7 }, (_, i) => {
    const start = now - (6 - i) * day;
    const orders = paid.filter((o) => {
      const t = new Date(o.paidAt ?? o.createdAt).getTime();
      return t >= start - day / 2 && t < start + day / 2;
    });
    return {
      label: new Date(start).toLocaleDateString("en-US", { weekday: "short" }),
      count: orders.length,
      amount: orders.reduce((s, o) => s + o.amountCents, 0),
    };
  });
  const maxWeek = Math.max(1, ...week.map((d) => d.count));

  const byGenre = new Map<string, number>();
  for (const order of paid) {
    const beat = beatById(order.beatId);
    if (!beat) continue;
    byGenre.set(beat.genre, (byGenre.get(beat.genre) ?? 0) + order.amountCents);
  }
  const genres = [...byGenre.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxGenre = Math.max(1, ...genres.map(([, v]) => v));

  const recentOrders = [...data.orders].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Revenue confirmed"
          value={formatMoney(revenue, settings.currency, settings.currencySymbol)}
          hint={`${paid.length} paid orders`}
        />
        <Stat
          label="Awaiting confirmation"
          value={String(pendingPayments.length)}
          hint={`${formatMoney(pendingAmount, settings.currency, settings.currencySymbol)} pending`}
        />
        <Stat
          label="Beats in the vault"
          value={String(data.beats.filter((b) => b.published).length)}
          hint={`${data.beats.length} total · ${formatCount(plays)} plays`}
        />
        <Stat
          label="Artists"
          value={String(artists.length)}
          hint={`${newMessages.length} new messages`}
        />
      </div>

      {pendingPayments.length > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">
                {pendingPayments.length} payment{pendingPayments.length === 1 ? "" : "s"} waiting on you
              </h2>
              <p className="mt-1 text-xs text-muted">
                Confirm a payment and the beat is emailed to the artist instantly.
              </p>
            </div>
            <Link href="/admin/orders" className="btn btn-primary text-xs">
              Review payments
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Sales this week</h2>
          <div className="mt-5 flex h-40 items-end gap-2">
            {week.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-muted-2">{d.count || ""}</span>
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-brand/40 to-brand-2 transition-all"
                  style={{ height: `${Math.max(4, (d.count / maxWeek) * 100)}%` }}
                  title={`${d.count} orders · ${formatMoney(d.amount, settings.currency, settings.currencySymbol)}`}
                />
                <span className="text-[10px] text-muted-2">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Revenue by genre</h2>
          {genres.length ? (
            <div className="mt-5 space-y-3">
              {genres.map(([genre, amount]) => (
                <div key={genre}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{genre}</span>
                    <span className="text-muted-2">
                      {formatMoney(amount, settings.currency, settings.currencySymbol)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
                      style={{ width: `${(amount / maxGenre) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted">No sales yet — your first order will show up here.</p>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Recent orders</h2>
          <Link href="/admin/orders" className="link text-xs font-semibold">
            All orders
          </Link>
        </div>
        {recentOrders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  <th className="px-5 py-3 font-semibold">Beat</th>
                  <th className="px-5 py-3 font-semibold">Artist</th>
                  <th className="px-5 py-3 font-semibold">License</th>
                  <th className="px-5 py-3 font-semibold">Amount</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentOrders.map((order) => {
                  const beat = beatById(order.beatId);
                  return (
                    <tr key={order.id} className="transition-colors hover:bg-panel/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
                            {beat?.artwork ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={artworkUrl(beat)} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </div>
                          <span className="font-semibold text-white">{beat?.title ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-muted">{order.userName}</p>
                        <p className="text-xs text-muted-2">{order.userEmail}</p>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{licenseById(order.licenseId)?.name ?? "—"}</td>
                      <td className="px-5 py-3.5 font-semibold text-white">
                        {formatMoney(order.amountCents, order.currency, settings.currencySymbol)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`badge ${
                            order.status === "DELIVERED" || order.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : order.status === "AWAITING_CONFIRMATION"
                                ? "bg-sky-500/15 text-sky-300"
                                : order.status === "CANCELLED"
                                  ? "bg-rose-500/15 text-rose-300"
                                  : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {order.status.replace("_", " ").toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-2">{timeAgo(order.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">No orders yet.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction href="/admin/beats" title="Upload a new beat" body="Audio, artwork and license tiers." />
        <QuickAction href="/admin/videos" title="Publish a video" body="Sessions, breakdowns and visuals." />
        <QuickAction href="/admin/settings" title="Payment & studio info" body="Mobile money lines and bank details." />
      </div>
    </div>
  );
}

function QuickAction({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="card p-5 transition-colors hover:border-brand/50">
      <p className="text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">{body}</p>
    </Link>
  );
}
