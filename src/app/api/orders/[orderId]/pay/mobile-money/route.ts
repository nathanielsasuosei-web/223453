import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitMobileMoneyPayment } from "@/lib/payments";
import { orderById } from "@/lib/store";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const order = orderById(orderId);
  if (!order || order.userId !== current.user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const payment = await submitMobileMoneyPayment(orderId, {
      provider: String(body.provider ?? "").trim(),
      phone: String(body.phone ?? "").trim(),
    });
    return NextResponse.json({ ok: true, paymentId: payment.id, reference: payment.reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit your payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
