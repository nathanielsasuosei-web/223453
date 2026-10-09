import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createBooking } from "@/lib/bookings";

/** Artist books a studio slot — creates the booking and holds the slot. */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to book a session." }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const booking = await createBooking(current.user, {
      serviceId: String(body.serviceId ?? ""),
      date: String(body.date ?? ""),
      start: String(body.start ?? ""),
      hours: Number(body.hours ?? 1),
      notes: String(body.notes ?? ""),
      phone: String(body.phone ?? ""),
    });
    return NextResponse.json({ ok: true, bookingId: booking.id, code: booking.code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create your booking.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
