import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, sessionBookingById, sessionServiceLabel } from "@/lib/store";
import { dueForBooking } from "@/lib/sessions";
import { BookingClient } from "@/components/BookingClient";

export const metadata: Metadata = {
  title: "Your session booking",
  robots: { index: false },
};

export default async function BookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await requireUser(`/login?next=/bookings/${id}`);
  const booking = sessionBookingById(id);
  if (!booking || (booking.userId !== current.user.id && current.user.role !== "ADMIN")) notFound();

  const settings = db().settings;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-2">
        <Link href="/book" className="transition-colors hover:text-white">
          Book a session
        </Link>
        <span>/</span>
        <span className="text-muted">{booking.code}</span>
      </nav>

      <BookingClient
        booking={{
          id: booking.id,
          code: booking.code,
          status: booking.status,
          service: sessionServiceLabel(booking.service),
          sessionDate: booking.sessionDate,
          sessionTime: booking.sessionTime,
          priceCents: booking.priceCents,
          depositCents: booking.depositCents,
          balanceCents: booking.balanceCents,
          currency: booking.currency,
          method: booking.method,
          createdAt: booking.createdAt,
          reference: booking.reference,
          phone: booking.phone,
          note: booking.note,
          depositPaidAt: booking.depositPaidAt,
          paidAt: booking.paidAt,
        }}
        due={dueForBooking(booking)}
        currency={settings.currency}
        currencySymbol={settings.currencySymbol}
        depositPercent={settings.sessions.depositPercent}
        momoAccounts={settings.momoAccounts}
        bankAccount={settings.bankAccount}
        paymentInstructions={settings.paymentInstructions}
      />
    </div>
  );
}
