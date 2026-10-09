import { requireAdminApi, serverError, str } from "@/lib/api-guard";
import { cancelSessionBooking } from "@/lib/sessions";

/** Admin cancels a session booking (pending payments are failed, artist is emailed). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = str(body.reason) || "The studio had to release your slot.";
    const booking = await cancelSessionBooking(id, reason);
    return Response.json({ ok: true, bookingCode: booking.code, status: booking.status });
  } catch (err) {
    return serverError(err, "admin cancel session booking");
  }
}
