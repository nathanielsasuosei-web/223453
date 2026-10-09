import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db, SESSION_SERVICES, type SessionService } from "@/lib/store";
import { depositCentsFor, isSessionService } from "@/lib/sessions";
import { BookingForm } from "@/components/BookingForm";
import { SectionHeading } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Book a session",
  description:
    "Book recording, mixing or mastering at the studio. Pay a 50% deposit to secure your slot and the balance before your session.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const params = await searchParams;
  const serviceParam = params.service ?? "";
  const next = `/login?next=/book${isSessionService(serviceParam) ? `?service=${serviceParam}` : ""}`;
  const current = await requireUser(next);
  const settings = db().settings;
  const sessionSettings = settings.sessions;

  if (!sessionSettings.enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="The studio"
          title="Book a session"
          subtitle="Session bookings are handled over email while the online calendar is offline."
        />
        <div className="card flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-panel-2 text-muted-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <h2 className="text-xl font-bold text-white">Online booking is paused</h2>
          <p className="max-w-md text-sm text-muted">
            The producer is not taking online session bookings right now. Send a message with your
            preferred service, date and time, and the studio will confirm your slot by email.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/contact" className="btn btn-primary text-xs">
              Message the studio
            </Link>
            <Link href="/beats" className="btn btn-ghost text-xs">
              Browse beats
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const services = SESSION_SERVICES.map((s) => {
    const priceCents =
      s.slug === "recording"
        ? sessionSettings.recordingPriceCents
        : s.slug === "mixing"
          ? sessionSettings.mixingPriceCents
          : sessionSettings.masteringPriceCents;
    return {
      ...s,
      priceCents,
      depositCents: depositCentsFor(priceCents),
      balanceCents: priceCents - depositCentsFor(priceCents),
    };
  }).filter((s) => s.priceCents > 0);

  const preselect = isSessionService(serviceParam) ? (serviceParam as SessionService) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <SectionHeading
        eyebrow="The studio"
        title="Book a session"
        subtitle="Pick a service, choose a date and pay a deposit to secure your slot — the balance is due before you walk in."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <BookingForm
          services={services}
          preselect={preselect}
          defaultPhone={current.user.phone}
          currency={settings.currency}
          currencySymbol={settings.currencySymbol}
          depositPercent={sessionSettings.depositPercent}
          depositNote={sessionSettings.note}
        />

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">How it works</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                ["Book & pay the deposit", `Pay ${sessionSettings.depositPercent}% of the session price up front with mobile money or bank transfer.`],
                ["Slot secured", "The moment the studio confirms your deposit, your date and time are locked in."],
                ["Pay the balance", "Settle the rest any time before your session — same payment methods."],
              ].map(([step, detail], i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/20 text-xs font-black text-violet-200">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{step}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Session prices</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {services.map((s) => (
                <li key={s.slug} className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-white">{s.label}</span>
                  <span className="text-muted">
                    {formatMoney(s.priceCents, settings.currency, settings.currencySymbol)}
                    <span className="ml-2 text-xs text-muted-2">
                      {formatMoney(s.depositCents, settings.currency, settings.currencySymbol)} deposit
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-muted-2">{sessionSettings.note}</p>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Need a custom slot?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Recording longer than a session, mixing a whole EP, or a date that's not working? Send the
              studio a message and we'll sort it out.
            </p>
            <Link href="/contact" className="btn btn-ghost mt-4 text-xs">
              Message the studio
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
