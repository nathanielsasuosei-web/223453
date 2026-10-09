import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { confirmSessionPayment } from "@/lib/sessions";
import { db } from "@/lib/store";

/** Admin confirms a session payment → deposit secures the slot, balance completes it. */
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

    const payment = db().payments.find((p) => p.id === paymentId);
    if (!payment) return badRequest("Payment not found.");

    const result = await confirmSessionPayment(paymentId, guard.admin);
    return Response.json({
      ok: true,
      bookingCode: result.booking.code,
      status: result.booking.status,
      emailedTo: result.booking.userEmail,
    });
  } catch (err) {
    return serverError(err, "admin confirm session payment");
  }
}
