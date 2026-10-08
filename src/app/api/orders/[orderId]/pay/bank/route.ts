import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitBankPayment } from "@/lib/payments";
import { orderById } from "@/lib/store";
import { saveUpload, UploadError } from "@/lib/upload";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  const order = orderById(orderId);
  if (!order || order.userId !== current.user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
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

    const payment = await submitBankPayment(orderId, { reference, note, proofPath });
    return NextResponse.json({ ok: true, paymentId: payment.id, reference: payment.reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not log your transfer.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
