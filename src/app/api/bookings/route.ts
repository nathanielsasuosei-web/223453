import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createSessionBooking } from "@/lib/sessions";

/** Artist books a studio session → redirect target pays the deposit. */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to book a session." }, { status: 401 });

  try {
    const body = await request.json();
    const booking = await createSessionBooking(current.user, {
      service: String(body.service ?? ""),
      sessionDate: String(body.sessionDate ?? ""),
      sessionTime: String(body.sessionTime ?? ""),
      phone: String(body.phone ?? ""),
      note: String(body.note ?? ""),
    });
    return NextResponse.json({ ok: true, bookingId: booking.id, code: booking.code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create your booking.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
