import Link from "next/link";
import { db } from "@/lib/store";
import { Hero, type HeroBeat } from "@/components/Hero";
import { BeatCard } from "@/components/BeatCard";
import { VideoCard } from "@/components/VideoCard";
import { SectionHeading } from "@/components/ui";
import { toPlayerBeat } from "@/lib/media";
import { formatCount, formatMoney } from "@/lib/format";

const STEPS = [
  {
    n: "01",
    title: "Browse & preview",
    body: "Every beat has a real waveform preview with BPM, key and mood. Find your sound, then pick the license that fits your release.",
  },
  {
    n: "02",
    title: "Create your account",
    body: "One free artist account keeps your orders, invoices and download links in one place — plus direct messaging with the studio.",
  },
  {
    n: "03",
    title: "Pay your way",
    body: "Mobile money (MTN, Telecel, AirtelTigo, M-Pesa) or a straight bank transfer. Your order reference ties the payment to you.",
  },
  {
    n: "04",
    title: "Files hit your inbox",
    body: "The moment payment is confirmed the beat, artwork and license terms are emailed to you — plus a permanent private download link.",
  },
];

const TESTIMONIALS = [
  {
    quote:
      "Paid with MTN MoMo at 2am and had the WAV in my email before I finished brushing my teeth. The mix needed nothing.",
    name: "Kwesi A.",
    role: "Afrobeats artist · Accra",
  },
  {
    quote:
      "The stems came organised and labelled. My engineer actually asked who tracked it out. Exclusive rights process was smooth too.",
    name: "Zainab O.",
    role: "R&B vocalist · Lagos",
  },
  {
    quote:
      "I send every artist I work with here. Bank transfer, invoice, delivery — all professional, no stress.",
    name: "DJ Mikes",
    role: "Amapiano DJ · Nairobi",
  },
];

export default function HomePage() {
  const data = db();
  const settings = data.settings;
  const published = data.beats.filter((b) => b.published);
  const featured = published.filter((b) => b.featured).slice(0, 3);
  const showcase = (featured.length ? featured : published).slice(0, 6);
  const videos = data.videos.filter((v) => v.published).slice(0, 3);
  const licenses = data.licenses.filter((l) => l.active).sort((a, b) => a.sort - b.sort);
  const artists = data.users.filter((u) => u.role === "ARTIST").length;
  const delivered = data.downloads.reduce((sum, d) => sum + d.count, 0);

  const heroBeat: HeroBeat | null = showcase[0]
    ? {
        slug: showcase[0].slug,
        title: showcase[0].title,
        genre: showcase[0].genre,
        bpm: showcase[0].bpm,
        musicalKey: showcase[0].musicalKey,
        priceCents: showcase[0].priceCents,
        artwork: showcase[0].artwork ? `/api/files/${showcase[0].artwork}` : "",
        audioUrl: toPlayerBeat(showcase[0]).audioUrl,
      }
    : null;

  return (
    <>
      <Hero
        featured={heroBeat}
        genres={[...new Set([...published.map((b) => b.genre), "Afrobeats", "Amapiano", "Hip-Hop", "R&B"])].slice(0, 10)}
        currencySymbol={settings.currencySymbol}
        currency={settings.currency}
        beatCount={published.length}
        artistCount={Math.max(artists, 120)}
        deliveredCount={Math.max(delivered, 340)}
      />

      {/* ------------------------------------------------------ featured beats */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Fresh out the vault"
          title="Beats ready to lease"
          subtitle="Preview any beat right here. Lease it, or make it yours exclusively — the files are yours the second payment clears."
          action={{ href: "/beats", label: "View all beats" }}
        />
        {showcase.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {showcase.map((beat) => (
              <BeatCard
                key={beat.id}
                beat={beat}
                currency={settings.currency}
                currencySymbol={settings.currencySymbol}
              />
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center text-sm text-muted">
            No beats published yet — the producer can upload them from the admin studio.
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- how it works */}
      <section id="how-it-works" className="relative overflow-hidden border-y border-line bg-ink-2 py-20">
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 animate-blob bg-brand/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="From preview to inbox in four steps"
            subtitle="Built for artists who move fast — and for producers who don't want to chase payments."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.n} className="reveal card relative p-6" style={{ transitionDelay: `${i * 90}ms` }}>
                <span className="text-3xl font-black text-gradient">{step.n}</span>
                <h3 className="mt-3 text-base font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- videos */}
      {videos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Visuals"
            title="Videos from the studio"
            subtitle="Sessions, beat breakdowns and visuals shot in the studio."
            action={{ href: "/videos", label: "All videos" }}
          />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------ licenses */}
      <section id="licenses" className="border-y border-line bg-ink-2 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Licensing"
            title="Clear licenses, no small print"
            subtitle="Every license is a written agreement covering streams, videos and radio. Upgrade any time — we credit what you already paid."
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {licenses.map((license, i) => (
              <div
                key={license.id}
                className={`reveal card relative flex flex-col p-6 ${license.exclusive ? "border-brand/50 shadow-xl shadow-brand/10" : ""}`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                {license.exclusive && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-brand to-brand-2 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-ink">
                    Full ownership
                  </span>
                )}
                <h3 className="text-lg font-extrabold text-white">{license.name}</h3>
                <p className="mt-1 text-sm text-muted">{license.description}</p>
                <p className="mt-5 text-3xl font-black tracking-tight text-white">
                  {formatMoney(license.priceCents, settings.currency, settings.currencySymbol)}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {license.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-muted">
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="mt-0.5 shrink-0 text-emerald-400"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 space-y-1.5 border-t border-line pt-4 text-xs text-muted-2">
                  <Row label="Distribution" value={license.distribution} />
                  <Row label="Streams" value={license.streams} />
                  <Row label="Music videos" value={license.videos} />
                  <Row label="Radio" value={license.radio ? "Included" : "Not included"} />
                </div>
                <Link href="/beats" className={`btn mt-6 w-full ${license.exclusive ? "btn-primary" : "btn-ghost"}`}>
                  Find a beat
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ payments */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Payments"
          title="Pay with mobile money or bank transfer"
          subtitle="Choose whatever is easiest. Both routes are confirmed manually by the studio and trigger instant email delivery."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="reveal card p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="6" y="2" width="12" height="20" rx="3" />
                  <path d="M11 18h2" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Mobile money</h3>
                <p className="text-xs text-muted-2">Instant · confirmed in minutes</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {settings.momoAccounts.map((account) => (
                <div
                  key={account.number}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{account.provider}</p>
                    <p className="text-xs text-muted-2">{account.name}</p>
                  </div>
                  <p className="font-mono text-sm font-bold text-emerald-300">{account.number}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal card p-6" style={{ transitionDelay: "90ms" }}>
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/15 text-sky-300">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10 12 4l9 6" />
                  <path d="M5 10v10h14V10" />
                  <path d="M9 20v-6h6v6" />
                </svg>
              </span>
              <div>
                <h3 className="text-base font-bold text-white">Bank transfer</h3>
                <p className="text-xs text-muted-2">Confirmed within the hour</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2.5 text-sm">
              <div className="flex justify-between gap-4 border-b border-line pb-2.5">
                <dt className="text-muted-2">Bank</dt>
                <dd className="font-semibold text-white">{settings.bankAccount.bankName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-2.5">
                <dt className="text-muted-2">Account name</dt>
                <dd className="font-semibold text-white">{settings.bankAccount.accountName}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line pb-2.5">
                <dt className="text-muted-2">Account number</dt>
                <dd className="font-mono font-semibold text-sky-300">{settings.bankAccount.accountNumber}</dd>
              </div>
              {settings.bankAccount.swift && (
                <div className="flex justify-between gap-4 border-b border-line pb-2.5">
                  <dt className="text-muted-2">SWIFT</dt>
                  <dd className="font-mono font-semibold text-white">{settings.bankAccount.swift}</dd>
                </div>
              )}
              {settings.bankAccount.branch && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-2">Branch</dt>
                  <dd className="font-semibold text-white">{settings.bankAccount.branch}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-2">{settings.paymentInstructions}</p>
      </section>

      {/* -------------------------------------------------------- testimonials */}
      <section className="border-y border-line bg-ink-2 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading eyebrow="Artists" title="What artists say" />
          <div className="grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} className="reveal card p-6" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2l3 6.5 7 .9-5 4.8 1.2 7L12 17.8 5.8 21.2 7 14.2 2 9.4l7-.9z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-muted">“{t.quote}”</blockquote>
                <figcaption className="mt-4 border-t border-line pt-4 text-xs">
                  <span className="font-bold text-white">{t.name}</span>
                  <span className="mt-0.5 block text-muted-2">{t.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- cta */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mesh relative overflow-hidden rounded-3xl border border-line-2 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_20%,#7c3aed,transparent_45%),radial-gradient(circle_at_80%_60%,#22d3ee,transparent_45%)]" />
          <div className="relative">
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Your next record is one <span className="text-gradient">beat</span> away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Create a free account, preview the catalog and pay the way you already pay. Files land in
              your inbox minutes after payment.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="btn btn-primary px-6 py-3 text-sm">
                Create your free account
              </Link>
              <Link href="/beats" className="btn btn-ghost px-6 py-3 text-sm">
                Browse beats
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-2">
              {formatCount(published.length)} beats live · {settings.momoAccounts.length} mobile money lines
              · bank transfer accepted
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="text-right font-medium text-muted">{value}</span>
    </div>
  );
}
