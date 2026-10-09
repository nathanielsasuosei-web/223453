import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { bookingById, db } from "@/lib/store";

/** Booking status for the artist's booking page (polled every few seconds). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const booking = bookingById(id);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== current.user.id && current.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  const payments = db()
    .payments.filter((p) => p.bookingId === booking.id)
    .map((p) => ({
      id: p.id,
      method: p.method,
      provider: p.provider,
      phone: p.phone,
      reference: p.reference,
      amountCents: p.amountCents,
      kind: p.kind,
      status: p.status,
      createdAt: p.createdAt,
      confirmedAt: p.confirmedAt,
    }));

  return NextResponse.json({
    booking: {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      date: booking.date,
      start: booking.start,
      hours: booking.hours,
      serviceName: booking.serviceName,
      totalCents: booking.totalCents,
      depositCents: booking.depositCents,
      balanceCents: booking.balanceCents,
      balancePaidAt: booking.balancePaidAt,
      depositPercent: booking.depositPercent,
      notes: booking.notes,
      createdAt: booking.createdAt,
    },
    payments,
  });
}
