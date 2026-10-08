import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/payments";

export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  try {
    const body = await request.json();
    const { order } = await createOrder(current.user, String(body.beatId ?? ""), String(body.licenseId ?? ""));
    return NextResponse.json({ ok: true, orderId: order.id, code: order.code });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
