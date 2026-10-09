import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { blockingBookings, db, studioServices } from "@/lib/store";
import { bookableDates, holdsFrom, labelTime, WEEKDAYS } from "@/lib/studio";
import { StudioBooking } from "@/components/StudioBooking";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Book studio time",
  description:
    "Recording, mixing and mastering sessions with the producer. Pick a slot and pay 50% now to lock it in.",
};

export default async function StudioPage({
  searchParams,
}: {
  searchParams?: Promise<{ service?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const current = await requireUser("/login?next=/studio");
  const data = db();
  const settings = data.settings;
  const studio = settings.studio;
  const services = studioServices();
  const dates = bookableDates(studio);
  const holds = holdsFrom(
    blockingBookings().map((b) => ({ date: b.date, start: b.start, hours: b.hours, status: b.status })),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow={studio.eyebrow}
        title={studio.title}
        subtitle={studio.subtitle}
        action={{ href: "/beats", label: "Browse beats" }}
      />

      {!studio.enabled || !services.length ? (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-bold text-white">Studio bookings are closed</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Online booking isn&apos;t taking slots right now. Message the studio and we&apos;ll find a time
            that works.
          </p>
          <Link href="/contact" className="btn btn-primary mt-5 text-xs">
            Message the studio
          </Link>
        </div>
      ) : (
        <StudioBooking
          services={services.map((s) => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            blurb: s.blurb,
            priceCents: s.priceCents,
            minHours: s.minHours,
            maxHours: s.maxHours,
          }))}
          studio={studio}
          dates={dates}
          holds={holds}
          initialServiceSlug={String(params.service ?? "")}
          currency={settings.currency}
          currencySymbol={settings.currencySymbol}
          user={{
            name: current.user.name,
            email: current.user.email,
            phone: current.user.phone ?? "",
          }}
        />
      )}

      {/* ------------------------------------------------------- opening hours */}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Opening hours</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {WEEKDAYS.map((day, index) => {
              const hours = studio.hours[String(index)];
              return (
                <li key={day} className="flex items-center justify-between gap-4">
                  <span className="text-muted">{day}</span>
                  <span className="font-semibold text-white">
                    {!hours || hours.closed ? "Closed" : `${labelTime(hours.open)} – ${labelTime(hours.close)}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Booking policy</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">{studio.policy}</p>
          <p className="mt-4 text-sm text-muted">
            Questions? Call{" "}
            <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="text-violet-300 hover:underline">
              {settings.contactPhone}
            </a>{" "}
            or email{" "}
            <a href={`mailto:${settings.contactEmail}`} className="text-violet-300 hover:underline">
              {settings.contactEmail}
            </a>
            .
          </p>
          <p className="mt-3 text-xs text-muted-2">
            {studio.address || settings.location}
          </p>
        </div>
      </div>
    </div>
  );
}
