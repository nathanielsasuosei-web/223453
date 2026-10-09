import Link from "next/link";
import { SectionHeading } from "./ui";

const SERVICES = [
  {
    title: "Recording",
    slug: "recording",
    kicker: "Step 01",
    body: "Track vocals, live instruments and ad-libs in a treated room with clean preamps, pro mics and a relaxed, focused session.",
    points: ["Vocal & instrument tracking", "Comp & tune passes", "Session notes & stems"],
    icon: "M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8",
    tone: "from-brand/30 to-transparent",
  },
  {
    title: "Mixing",
    slug: "mixing",
    kicker: "Step 02",
    body: "Balance every element so your record feels full, punchy and radio-ready on any speaker, from earbuds to club systems.",
    points: ["Levels, EQ & panning", "Vocal processing & effects", "Revisions included"],
    icon: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    tone: "from-brand-2/25 to-transparent",
  },
  {
    title: "Mastering",
    slug: "mastering",
    kicker: "Step 03",
    body: "The final polish. Loudness, tone and stereo width tuned for streaming platforms, so your track sits right next to the hits.",
    points: ["Loudness for streaming", "Stereo & tonal balance", "WAV, MP3 & distribution masters"],
    icon: "M12 3v18M7 7v10M17 5v14M3 11v2M21 9v6",
    tone: "from-brand-3/25 to-transparent",
  },
];

export function StudioSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <SectionHeading
        eyebrow="The studio"
        title="Recording, mixing & mastering"
        subtitle="Take a song from the first take to a finished master. Book a session, or send your stems and we'll handle the rest."
        action={{ href: "/contact", label: "Book a session" }}
      />
      <div className="grid gap-5 md:grid-cols-3">
        {SERVICES.map((s) => (
          <article
            key={s.title}
            className="card group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-line-2"
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.tone} opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={s.icon} />
                  </svg>
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-2">{s.kicker}</span>
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              <ul className="mt-5 space-y-2">
                {s.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-brand to-brand-2" />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={`/contact?service=${s.slug}`}
                className="btn btn-ghost mt-6 w-full text-xs transition-colors group-hover:border-brand/50 group-hover:text-white"
              >
                Book {s.title.toLowerCase()}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-panel/60 px-5 py-4 backdrop-blur">
        <p className="text-sm text-muted">Need only one stage? Book recording, mixing or mastering on its own.</p>
        <Link href="/contact" className="btn btn-primary text-xs">
          Get a quote
        </Link>
      </div>
    </section>
  );
}
