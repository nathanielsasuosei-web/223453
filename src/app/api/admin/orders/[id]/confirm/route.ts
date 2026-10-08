import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { confirmPayment } from "@/lib/payments";
import { paymentById } from "@/lib/store";

/** Admin confirms a payment → order is marked delivered and the beat is emailed. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const paymentId = str(body.paymentId) || id;

    const payment = paymentById(paymentId);
    if (!payment) return badRequest("Payment not found.");

    const result = await confirmPayment(paymentId, guard.admin);
    return Response.json({
      ok: true,
      orderCode: result.order.code,
      status: result.order.status,
      emailedTo: result.order.userEmail,
    });
  } catch (err) {
    return serverError(err, "admin confirm payment");
  }
}
