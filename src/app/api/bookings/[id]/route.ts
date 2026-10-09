import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sessionBookingById } from "@/lib/store";
import { dueForBooking } from "@/lib/sessions";

/** Booking status for the artist's booking page (polls this every few seconds). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const booking = sessionBookingById(id);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.userId !== current.user.id && current.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your booking" }, { status: 403 });
  }

  return NextResponse.json({
    booking: {
      id: booking.id,
      code: booking.code,
      status: booking.status,
      method: booking.method,
      service: booking.service,
      sessionDate: booking.sessionDate,
      sessionTime: booking.sessionTime,
      priceCents: booking.priceCents,
      depositCents: booking.depositCents,
      balanceCents: booking.balanceCents,
      currency: booking.currency,
      depositPaidAt: booking.depositPaidAt,
      paidAt: booking.paidAt,
      createdAt: booking.createdAt,
      reference: booking.reference,
      due: dueForBooking(booking),
    },
  });
}
