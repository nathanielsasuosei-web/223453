import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitSessionBankPayment } from "@/lib/sessions";
import { sessionBookingById } from "@/lib/store";
import { saveUpload, UploadError } from "@/lib/upload";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const booking = sessionBookingById(id);
  if (!booking || (booking.userId !== current.user.id && current.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  try {
    const form = await request.formData();
    const reference = String(form.get("reference") ?? "");
    const note = String(form.get("note") ?? "");

    let proofPath: string | null = null;
    const proof = form.get("proof");
    if (proof instanceof File && proof.size > 0) {
      try {
        const saved = await saveUpload(proof, "doc", proof.name);
        proofPath = saved.path;
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        // a bad receipt file shouldn't block the transfer record
      }
    }

    const payment = await submitSessionBankPayment(id, { reference, note, proofPath });
    return NextResponse.json({ ok: true, paymentId: payment.id, reference: payment.reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not log your transfer.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
