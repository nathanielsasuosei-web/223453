import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { bookingById, db } from "@/lib/store";
import { BookingCheckout } from "@/components/BookingCheckout";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false },
};

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) redirect(`/login?next=/booking/${id}`);

  const booking = bookingById(id);
  if (!booking) notFound();
  if (booking.userId !== current.user.id && current.user.role !== "ADMIN") notFound();

  const settings = db().settings;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-2">
        <Link href="/studio" className="transition-colors hover:text-white">
          Studio
        </Link>
        <span>/</span>
        <span className="text-muted">Booking {booking.code}</span>
      </nav>

      <BookingCheckout
        booking={{
          id: booking.id,
          code: booking.code,
          status: booking.status,
          serviceName: booking.serviceName,
          date: booking.date,
          start: booking.start,
          hours: booking.hours,
          notes: booking.notes,
          totalCents: booking.totalCents,
          depositCents: booking.depositCents,
          balanceCents: booking.balanceCents,
          depositPercent: booking.depositPercent,
          balancePaidAt: booking.balancePaidAt,
          createdAt: booking.createdAt,
        }}
        currency={booking.currency || settings.currency}
        currencySymbol={settings.currencySymbol}
        momoAccounts={settings.momoAccounts}
        bankAccount={settings.bankAccount}
        paymentInstructions={settings.paymentInstructions}
        policy={settings.studio.policy}
      />
    </div>
  );
}
