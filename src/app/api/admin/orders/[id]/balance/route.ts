import { requireAdminApi, serverError } from "@/lib/api-guard";
import { markBalancePaid } from "@/lib/payments";
import { orderById } from "@/lib/store";

/** Producer records the outstanding 50% being paid (cash / at the studio). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const order = orderById(id);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    const result = await markBalancePaid(id, guard.admin);
    return Response.json({
      ok: true,
      orderCode: result.order.code,
      status: result.order.status,
      emailedTo: result.order.userEmail,
    });
  } catch (err) {
    return serverError(err, "admin mark balance paid");
  }
}
