import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/store";
import { ContactForm } from "@/components/ContactForm";
import { SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Contact the studio",
  description: "Message BeatForge about custom beats, licensing, collabs or anything else.",
};

export default async function ContactPage() {
  const current = await getCurrentUser();
  const settings = db().settings;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="Contact"
        title={settings.site.contact.title}
        subtitle={settings.site.contact.subtitle}
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <ContactForm
          defaultName={current?.name ?? ""}
          defaultEmail={current?.email ?? ""}
          loggedIn={Boolean(current)}
        />

        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Direct lines</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-violet-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m2 7 10 6 10-6" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] text-muted-2">Email</p>
                  <a href={`mailto:${settings.contactEmail}`} className="font-semibold text-white hover:text-violet-200">
                    {settings.contactEmail}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] text-muted-2">Phone / WhatsApp</p>
                  <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="font-semibold text-white hover:text-violet-200">
                    {settings.contactPhone}
                  </a>
                </div>
              </li>
              <li className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-300">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] text-muted-2">Studio</p>
                  <p className="font-semibold text-white">{settings.location}</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Response times</h2>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                Payment confirmations: within minutes, 24/7
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                Messages &amp; custom beat quotes: same business day
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                Exclusive rights paperwork: within 24 hours
              </li>
            </ul>
            <p className="mt-4 text-xs text-muted-2">
              Every reply is sent to your email, and the full thread stays in your artist account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
