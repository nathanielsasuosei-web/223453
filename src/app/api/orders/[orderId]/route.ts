import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, orderById } from "@/lib/store";

/** Order status for the artist's checkout page (polls this every few seconds). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const order = orderById(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.userId !== current.user.id && current.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Not your order" }, { status: 403 });
  }

  const download = db().downloads.find((d) => d.orderId === order.id);
  return NextResponse.json({
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      method: order.method,
      amountCents: order.amountCents,
      downloadToken: download?.token ?? null,
    },
  });
}
