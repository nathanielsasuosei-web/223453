import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { beatById, db, licenseById, orderById } from "@/lib/store";
import { downloadForOrder } from "@/lib/payments";
import { CheckoutClient } from "@/components/CheckoutClient";
import { artworkUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const current = await requireUser("/login?next=/checkout/" + orderId);
  const order = orderById(orderId);
  if (!order || order.userId !== current.user.id) notFound();

  const beat = beatById(order.beatId);
  if (!beat) notFound();
  const license = licenseById(order.licenseId);
  const settings = db().settings;
  const download = downloadForOrder(order.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-2">
        <Link href="/beats" className="transition-colors hover:text-white">
          Beats
        </Link>
        <span>/</span>
        <Link href={`/beats/${beat.slug}`} className="transition-colors hover:text-white">
          {beat.title}
        </Link>
        <span>/</span>
        <span className="text-muted">Checkout</span>
      </nav>

      <CheckoutClient
        order={{
          id: order.id,
          code: order.code,
          status: order.status,
          amountCents: order.amountCents,
          currency: order.currency,
          method: order.method,
          createdAt: order.createdAt,
          reference: order.reference,
          plan: order.plan,
          depositCents: order.depositCents,
          balanceCents: order.balanceCents,
          balancePaidAt: order.balancePaidAt,
          paidAt: order.paidAt,
        }}
        beat={{
          title: beat.title,
          slug: beat.slug,
          genre: beat.genre,
          bpm: beat.bpm,
          musicalKey: beat.musicalKey,
          artwork: artworkUrl(beat),
        }}
        licenseName={license?.name ?? "License"}
        currency={settings.currency}
        currencySymbol={settings.currencySymbol}
        downloadToken={download?.token ?? null}
        momoAccounts={settings.momoAccounts}
        bankAccount={settings.bankAccount}
        paymentInstructions={settings.paymentInstructions}
        balanceNote="The balance is also payable at the studio — the producer can mark it paid from the dashboard."
      />
    </div>
  );
}
