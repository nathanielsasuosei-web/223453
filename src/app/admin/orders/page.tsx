import type { Metadata } from "next";
import { db } from "@/lib/store";
import { OrderManager } from "@/components/admin/OrderManager";
import { beatById, licenseById } from "@/lib/store";
import { publicUrl } from "@/lib/upload";

export const metadata: Metadata = {
  title: "Orders & payments",
};

const FILTERS = ["ALL", "AWAITING_CONFIRMATION", "PENDING", "DELIVERED", "CANCELLED"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const data = db();
  const filter = (params.status ?? "ALL").toUpperCase();
  const active = FILTERS.includes(filter as (typeof FILTERS)[number]) ? filter : "ALL";

  const orders = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((order) => (active === "ALL" ? true : order.status === active))
    .map((order) => {
      const beat = beatById(order.beatId);
      return {
        id: order.id,
        code: order.code,
        status: order.status,
        amountCents: order.amountCents,
        currency: order.currency,
        method: order.method,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        deliveredAt: order.deliveredAt,
        plan: order.plan,
        depositCents: order.depositCents,
        balanceCents: order.balanceCents,
        balancePaidAt: order.balancePaidAt,
        userName: order.userName,
        userEmail: order.userEmail,
        beatTitle: beat?.title ?? "—",
        beatSlug: beat?.slug ?? "",
        licenseName: licenseById(order.licenseId)?.name ?? "—",
        payments: data.payments
          .filter((p) => p.orderId === order.id)
          .map((p) => ({
            id: p.id,
            method: p.method,
            provider: p.provider,
            phone: p.phone,
            reference: p.reference,
            amountCents: p.amountCents,
            kind: p.kind,
            status: p.status,
            note: p.note,
            createdAt: p.createdAt,
            confirmedAt: p.confirmedAt,
            confirmedBy: p.confirmedBy,
            proofUrl: publicUrl(p.proofPath),
          })),
      };
    });

  const counts = {
    ALL: data.orders.length,
    AWAITING_CONFIRMATION: data.orders.filter((o) => o.status === "AWAITING_CONFIRMATION").length,
    PENDING: data.orders.filter((o) => o.status === "PENDING").length,
    DELIVERED: data.orders.filter((o) => o.status === "PAID" || o.status === "DELIVERED").length,
    CANCELLED: data.orders.filter((o) => o.status === "CANCELLED").length,
  };

  return (
    <OrderManager
      orders={orders}
      counts={counts}
      filter={active}
      currencySymbol={data.settings.currencySymbol}
    />
  );
}
