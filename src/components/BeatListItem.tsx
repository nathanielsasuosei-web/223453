"use client";

import Link from "next/link";
import { AudioBars } from "./AudioBars";
import { usePlayer } from "./PlayerProvider";
import { formatCount, formatMoney } from "@/lib/format";
import type { Beat } from "@/lib/store";
import { artworkUrl, toPlayerBeat } from "@/lib/media";

/** Compact horizontal row for a beat, used in the list view. */
export function BeatListItem({
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
  const playing = isCurrent && player.isPlaying;

  return (
    <article className="group card flex items-center gap-4 p-3 transition-colors duration-300 hover:border-line-2 hover:bg-panel-2/60 sm:gap-5 sm:p-4">
      <button
        onClick={() => hasAudio && player.play(playerBeat)}
        disabled={!hasAudio}
        aria-label={playing ? `Pause ${beat.title}` : `Play ${beat.title}`}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-20"
      >
        {beat.artwork ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl(beat)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-brand/40 via-panel to-brand-2/30 text-sm font-black text-white/25">
            {beat.title.slice(0, 2).toUpperCase()}
          </span>
        )}
        {hasAudio && (
          <span
            className={`absolute inset-0 grid place-items-center bg-ink/55 text-white transition-opacity ${
              playing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {playing ? (
              <AudioBars playing className="h-4" bars={3} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link href={`/beats/${beat.slug}`} className="min-w-0 max-w-full">
            <h3 className="truncate text-base font-bold text-white transition-colors group-hover:text-violet-200">
              {beat.title}
            </h3>
          </Link>
          <span className="badge bg-brand/15 text-violet-300">{beat.genre}</span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {beat.bpm > 0 && (
            <>
              <span>{beat.bpm} BPM</span>
              <span className="h-1 w-1 rounded-full bg-muted-2" />
            </>
          )}
          <span>{beat.musicalKey}</span>
          <span className="h-1 w-1 rounded-full bg-muted-2" />
          <span className="truncate">{beat.mood}</span>
          <span className="h-1 w-1 rounded-full bg-muted-2" />
          <span>{formatCount(beat.plays)} plays</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-2">Lease from</p>
          <p className="text-base font-extrabold text-white sm:text-lg">
            {formatMoney(beat.priceCents, currency, currencySymbol)}
          </p>
        </div>
        <Link href={`/beats/${beat.slug}`} className="btn btn-ghost hidden text-xs sm:inline-flex">
          Buy &amp; license
        </Link>
      </div>
    </article>
  );
}
