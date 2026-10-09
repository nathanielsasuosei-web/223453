"use client";

import Link from "next/link";
import { AudioBars } from "./AudioBars";
import { BeatPreviewTrack } from "./BeatPreviewTrack";
import { usePlayer } from "./PlayerProvider";
import { formatCount, formatMoney } from "@/lib/format";
import type { Beat } from "@/lib/store";
import { artworkUrl, toPlayerBeat } from "@/lib/media";

export function BeatCard({
  beat,
  currencySymbol = "$",
  currency = "USD",
}: {
  beat: Beat;
  currencySymbol?: string;
  currency?: string;
}) {
  const player = usePlayer();
  const playerBeat = toPlayerBeat(beat);
  const isCurrent = player.current?.id === beat.id;
  const hasAudio = Boolean(playerBeat.audioUrl);

  return (
    <article className="group card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-2xl hover:shadow-brand/10">
      <div className="relative aspect-square overflow-hidden">
        {beat.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl(beat)}
            alt={`${beat.title} artwork`}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand/40 via-panel to-brand-2/30">
            <span className="text-4xl font-black text-white/20">{beat.title.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent opacity-90" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="badge bg-ink/80 text-violet-300 backdrop-blur">{beat.genre}</span>
          {beat.bpm > 0 && (
            <span className="badge bg-ink/80 text-muted backdrop-blur">{beat.bpm} BPM</span>
          )}
        </div>

        <button
          onClick={() => hasAudio && player.play(playerBeat)}
          disabled={!hasAudio}
          aria-label={isCurrent && player.isPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
          className={`absolute bottom-3 right-3 grid h-12 w-12 place-items-center rounded-full border border-white/20 backdrop-blur transition-all duration-300 ${
            hasAudio
              ? "bg-gradient-to-br from-brand to-brand-2 text-ink hover:scale-110"
              : "cursor-not-allowed bg-panel/80 text-muted-2"
          }`}
        >
          {isCurrent && player.isPlaying ? (
            <AudioBars playing className="h-4" bars={3} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="absolute inset-x-3 bottom-3 pr-16">
          <Link href={`/beats/${beat.slug}`}>
            <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-violet-200">
              {beat.title}
            </h3>
          </Link>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            <span>{beat.musicalKey}</span>
            <span className="h-1 w-1 rounded-full bg-muted-2" />
            <span>{beat.mood}</span>
            <span className="h-1 w-1 rounded-full bg-muted-2" />
            <span>{formatCount(beat.plays)} plays</span>
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Lease from</p>
          <p className="text-lg font-extrabold text-white">
            {formatMoney(beat.priceCents, currency, currencySymbol)}
          </p>
        </div>
        <Link href={`/beats/${beat.slug}`} className="btn btn-ghost text-xs">
          Buy &amp; license
        </Link>
      </div>

      <BeatPreviewTrack
        beat={playerBeat}
        durationSec={beat.durationSec}
        className="border-t border-line px-4 py-3"
      />
    </article>
  );
}
