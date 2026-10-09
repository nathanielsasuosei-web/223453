import type { Metadata } from "next";
import { db, sessionServiceLabel } from "@/lib/store";
import { BookingManager } from "@/components/admin/BookingManager";
import { publicUrl } from "@/lib/upload";

export const metadata: Metadata = {
  title: "Session bookings",
};

const FILTERS = ["ALL", "AWAITING_DEPOSIT", "DEPOSIT_PAID", "AWAITING_BALANCE", "PAID", "CANCELLED"] as const;

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const data = db();
  const filter = (params.status ?? "ALL").toUpperCase();
  const active = FILTERS.includes(filter as (typeof FILTERS)[number]) ? filter : "ALL";

  const bookings = [...data.sessionBookings]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((booking) => (active === "ALL" ? true : booking.status === active))
    .map((booking) => ({
      id: booking.id,
      code: booking.code,
      status: booking.status,
      service: sessionServiceLabel(booking.service),
      sessionDate: booking.sessionDate,
      sessionTime: booking.sessionTime,
      phone: booking.phone,
      note: booking.note,
      priceCents: booking.priceCents,
      depositCents: booking.depositCents,
      balanceCents: booking.balanceCents,
      currency: booking.currency,
      method: booking.method,
      createdAt: booking.createdAt,
      depositPaidAt: booking.depositPaidAt,
      paidAt: booking.paidAt,
      userName: booking.userName,
      userEmail: booking.userEmail,
      payments: data.payments
        .filter((p) => p.bookingId === booking.id)
        .map((p) => ({
          id: p.id,
          method: p.method,
          purpose: p.purpose ?? "ORDER",
          provider: p.provider,
          phone: p.phone,
          reference: p.reference,
          amountCents: p.amountCents,
          status: p.status,
          note: p.note,
          createdAt: p.createdAt,
          confirmedAt: p.confirmedAt,
          confirmedBy: p.confirmedBy,
          proofUrl: publicUrl(p.proofPath),
        })),
    }));

  const counts = {
    ALL: data.sessionBookings.length,
    AWAITING_DEPOSIT: data.sessionBookings.filter((b) => b.status === "AWAITING_DEPOSIT").length,
    DEPOSIT_PAID: data.sessionBookings.filter((b) => b.status === "DEPOSIT_PAID").length,
    AWAITING_BALANCE: data.sessionBookings.filter((b) => b.status === "AWAITING_BALANCE").length,
    PAID: data.sessionBookings.filter((b) => b.status === "PAID").length,
    CANCELLED: data.sessionBookings.filter((b) => b.status === "CANCELLED").length,
  };

  return (
    <BookingManager
      bookings={bookings}
      counts={counts}
      filter={active}
      currencySymbol={data.settings.currencySymbol}
    />
  );
}
