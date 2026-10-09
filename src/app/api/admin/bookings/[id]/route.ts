import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import {
  cancelBooking,
  completeBooking,
  confirmBookingPayment,
  markBookingBalancePaid,
} from "@/lib/bookings";
import { bookingById, db, persist } from "@/lib/store";

/**
 * Producer actions on a booking:
 *   { action: "confirm-payment", paymentId }
 *   { action: "balance-paid" }
 *   { action: "complete" }
 *   { action: "cancel", reason }
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const action = str(body.action);
    const booking = bookingById(id);
    if (!booking) return badRequest("Booking not found.");

    if (action === "confirm-payment") {
      const paymentId = str(body.paymentId);
      if (!paymentId) return badRequest("Pick a payment to confirm.");
      const updated = await confirmBookingPayment(paymentId, guard.admin);
      return Response.json({ ok: true, status: updated.status });
    }

    if (action === "balance-paid") {
      const updated = await markBookingBalancePaid(id, guard.admin);
      return Response.json({ ok: true, status: updated.status });
    }

    if (action === "complete") {
      const updated = await completeBooking(id, guard.admin);
      return Response.json({ ok: true, status: updated.status });
    }

    if (action === "cancel") {
      const updated = await cancelBooking(id, guard.admin, str(body.reason));
      return Response.json({ ok: true, status: updated.status });
    }

    if (action === "refund-deposit") {
      // Mark the confirmed deposit as failed so it stops counting as income.
      const now = new Date().toISOString();
      for (const payment of db().payments) {
        if (payment.bookingId === id && payment.status === "CONFIRMED") {
          payment.status = "FAILED";
          payment.note = `Refunded by ${guard.admin.name} · ${now}`;
        }
      }
      persist("payments");
      return Response.json({ ok: true, status: booking.status });
    }

    return badRequest("Unknown booking action.");
  } catch (err) {
    return serverError(err, "admin booking action");
  }
}
