import type { Metadata } from "next";
import { db } from "@/lib/store";
import { todayKey } from "@/lib/studio";
import { BookingManager, type AdminBooking } from "@/components/admin/BookingManager";

export const metadata: Metadata = {
  title: "Studio bookings",
};

const FILTERS = ["ALL", "UPCOMING", "AWAITING_CONFIRMATION", "PENDING_PAYMENT", "COMPLETED", "CANCELLED"];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const data = db();
  const filter = (params.status ?? "ALL").toUpperCase();
  const active = FILTERS.includes(filter) ? filter : "ALL";
  const today = todayKey();

  const all = [...data.bookings].sort(
    (a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`),
  );

  const matches = (status: string) =>
    all.filter((b) => {
      if (status === "ALL") return true;
      if (status === "UPCOMING") return b.status === "CONFIRMED" && b.date >= today;
      return b.status === status;
    });

  const bookings: AdminBooking[] = matches(active).map((booking) => ({
    id: booking.id,
    code: booking.code,
    status: booking.status,
    serviceName: booking.serviceName,
    date: booking.date,
    start: booking.start,
    hours: booking.hours,
    notes: booking.notes,
    userName: booking.userName,
    userEmail: booking.userEmail,
    userPhone: booking.userPhone,
    totalCents: booking.totalCents,
    depositCents: booking.depositCents,
    balanceCents: booking.balanceCents,
    depositPercent: booking.depositPercent,
    balancePaidAt: booking.balancePaidAt,
    currency: booking.currency,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    payments: data.payments
      .filter((p) => p.bookingId === booking.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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
      })),
  }));

  const counts: Record<string, number> = {};
  for (const f of FILTERS) counts[f] = matches(f).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Studio bookings</h2>
        <p className="mt-1 text-xs text-muted">
          Deposits, balances and the session calendar. Confirming a deposit locks the slot and emails the
          artist.
        </p>
      </div>
      <BookingManager
        bookings={bookings}
        counts={counts}
        filter={active}
        currencySymbol={data.settings.currencySymbol}
      />
    </div>
  );
}
