import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitSessionMomoPayment } from "@/lib/sessions";
import { sessionBookingById } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const booking = sessionBookingById(id);
  if (!booking || (booking.userId !== current.user.id && current.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const payment = await submitSessionMomoPayment(id, {
      provider: String(body.provider ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
    });
    return NextResponse.json({ ok: true, paymentId: payment.id, reference: payment.reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit your payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
