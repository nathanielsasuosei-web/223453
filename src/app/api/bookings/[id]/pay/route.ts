import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { submitBookingPayment } from "@/lib/bookings";
import { saveUpload, UploadError } from "@/lib/upload";

/** Artist submits the deposit (or the balance) for a booking. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });

  try {
    const isForm = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
    let method = "";
    let provider = "";
    let phone = "";
    let reference = "";
    let note = "";
    let proofPath: string | null = null;

    if (isForm) {
      const form = await request.formData();
      method = String(form.get("method") ?? "");
      provider = String(form.get("provider") ?? "");
      phone = String(form.get("phone") ?? "");
      reference = String(form.get("reference") ?? "");
      note = String(form.get("note") ?? "");
      const proof = form.get("proof");
      if (proof instanceof File && proof.size > 0) {
        try {
          proofPath = (await saveUpload(proof, "doc", proof.name)).path;
        } catch (err) {
          if (!(err instanceof UploadError)) throw err;
          // a bad receipt file shouldn't block the transfer record
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      method = String(body.method ?? "");
      provider = String(body.provider ?? "");
      phone = String(body.phone ?? "");
      reference = String(body.reference ?? "");
      note = String(body.note ?? "");
    }

    const payment = await submitBookingPayment(id, current.user, {
      method: method === "BANK" ? "BANK" : "MOBILE_MONEY",
      provider,
      phone,
      reference,
      note,
      proofPath,
    });
    return NextResponse.json({ ok: true, paymentId: payment.id, reference: payment.reference });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not submit your payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
