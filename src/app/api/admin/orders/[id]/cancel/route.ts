import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { cancelOrder } from "@/lib/payments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = str(body.reason) || "The studio cancelled this order. No payment was received.";
    const order = await cancelOrder(id, reason);
    return Response.json({ ok: true, code: order.code, status: order.status });
  } catch (err) {
    return serverError(err, "admin cancel order");
  }
}
