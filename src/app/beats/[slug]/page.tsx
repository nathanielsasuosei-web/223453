import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { beatBySlug, db, licenseById } from "@/lib/store";
import { audioUrl, artworkUrl } from "@/lib/media";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { BeatCard } from "@/components/BeatCard";
import { LicensePicker } from "@/components/LicensePicker";
import { formatCount, formatDuration } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const beat = beatBySlug(slug);
  if (!beat) return { title: "Beat not found" };
  return {
    title: `${beat.title} — ${beat.genre} beat`,
    description: `${beat.bpm} BPM ${beat.musicalKey} ${beat.genre} beat. ${beat.mood}. Lease or buy exclusive rights — instant email delivery.`,
  };
}

export default async function BeatDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const beat = beatBySlug(slug);
  if (!beat || !beat.published) notFound();

  const data = db();
  const settings = data.settings;
  const licenses = data.licenses
    .filter((l) => l.active)
    .sort((a, b) => a.sort - b.sort)
    .map((l) => ({
      id: l.id,
      name: l.name,
      description: l.description,
      priceCents: l.priceCents,
      includes: l.includes,
      exclusive: l.exclusive,
    }));

  const related = data.beats
    .filter((b) => b.published && b.id !== beat.id && b.genre === beat.genre)
    .slice(0, 4);
  const fallbackRelated = related.length
    ? related
    : data.beats.filter((b) => b.published && b.id !== beat.id).slice(0, 4);

  const preview = audioUrl(beat);
  const license = licenseById(beat.files[0]?.tier ?? "");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-6 flex items-center gap-2 text-xs text-muted-2">
        <Link href="/" className="transition-colors hover:text-white">
          Home
        </Link>
        <span>/</span>
        <Link href="/beats" className="transition-colors hover:text-white">
          Beats
        </Link>
        <span>/</span>
        <span className="text-muted">{beat.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        {/* ------------------------------------------------------------ left */}
        <div>
          <div className="card overflow-hidden">
            <div className="relative aspect-square sm:aspect-video">
              {beat.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artworkUrl(beat)}
                  alt={`${beat.title} artwork`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand/40 via-panel to-brand-2/30">
                  <span className="text-6xl font-black text-white/20">{beat.title.slice(0, 2).toUpperCase()}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge bg-brand/25 text-violet-200 backdrop-blur">{beat.genre}</span>
                  <span className="badge bg-ink/80 text-muted backdrop-blur">{beat.bpm} BPM</span>
                  <span className="badge bg-ink/80 text-muted backdrop-blur">{beat.musicalKey}</span>
                  <span className="badge bg-ink/80 text-muted backdrop-blur">{beat.mood}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-5 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Preview</h2>
              <span className="font-mono text-xs text-muted-2">{formatDuration(beat.durationSec)}</span>
            </div>
            {preview ? (
              <WaveformPlayer src={preview} height={110} />
            ) : (
              <p className="text-sm text-muted-2">No preview file has been uploaded for this beat yet.</p>
            )}
          </div>

          <div className="card mt-5 p-6">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">About this beat</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
              {beat.description || "No description yet."}
            </p>
            {beat.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {beat.tags.map((tag) => (
                  <span key={tag} className="chip">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
              <Meta label="Plays" value={formatCount(beat.plays)} />
              <Meta label="Sales" value={formatCount(beat.sales)} />
              <Meta label="BPM" value={String(beat.bpm)} />
              <Meta label="Key" value={beat.musicalKey} />
            </dl>
          </div>
        </div>

        {/* ----------------------------------------------------------- right */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-400">
              {beat.genre} · {beat.mood}
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white">{beat.title}</h1>
            <p className="mt-2 text-sm text-muted">
              Produced by <span className="font-semibold text-white">{settings.producerName}</span> ·{" "}
              {settings.location}
            </p>

            <div className="mt-6">
              <LicensePicker
                beatId={beat.id}
                slug={beat.slug}
                licenses={licenses}
                currency={settings.currency}
                currencySymbol={settings.currencySymbol}
              />
            </div>

            <div className="mt-6 space-y-3 border-t border-line pt-5 text-xs text-muted-2">
              <p className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-emerald-400">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Instant email delivery once payment is confirmed
              </p>
              <p className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-emerald-400">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Pay with mobile money or bank transfer
              </p>
              <p className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0 text-emerald-400">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Free artist account keeps every order and download in one place
              </p>
            </div>
          </div>

          <div className="card mt-5 p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Files included</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {beat.files.length ? (
                beat.files.map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 text-muted">
                    <span className="flex items-center gap-2">
                      <FileIcon kind={file.kind} />
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-2">
                      {file.tier === "*" ? "all licenses" : licenseById(file.tier)?.name ?? file.tier}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-muted-2">Files are attached after purchase.</li>
              )}
            </ul>
            {license && (
              <p className="mt-3 text-xs text-muted-2">
                Preview is the tagged version. The untagged master ships with {license.name} and above.
              </p>
            )}
          </div>
        </div>
      </div>

      {fallbackRelated.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-extrabold text-white">More like this</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {fallbackRelated.map((b) => (
              <BeatCard
                key={b.id}
                beat={b}
                currency={settings.currency}
                currencySymbol={settings.currencySymbol}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-white">{value}</dd>
    </div>
  );
}

function FileIcon({ kind }: { kind: string }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-panel-2 text-[10px] font-bold text-violet-300">
      {kind}
    </span>
  );
}

