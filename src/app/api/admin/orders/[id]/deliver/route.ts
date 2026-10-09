import { requireAdminApi, serverError } from "@/lib/api-guard";
import { deliverOrder } from "@/lib/payments";
import { orderById } from "@/lib/store";

/** Producer releases the files early (e.g. trusted artist, balance promised). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const order = orderById(id);
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    if (order.status === "CANCELLED") {
      return Response.json({ error: "Cancelled orders cannot be delivered." }, { status: 400 });
    }
    const download = await deliverOrder(id);
    const updated = orderById(id)!;
    return Response.json({
      ok: true,
      orderCode: updated.code,
      status: updated.status,
      emailedTo: updated.userEmail,
      downloadToken: download.token,
    });
  } catch (err) {
    return serverError(err, "admin deliver order");
  }
}
