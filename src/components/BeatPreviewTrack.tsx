"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, type PlayerBeat } from "./PlayerProvider";
import { loadPeaks } from "@/lib/audio-peaks";
import { formatDuration } from "@/lib/format";

const BARS = 64;

/**
 * Inline preview track for a single beat row: a scrubbable waveform wired to
 * the global player, so every beat in a listing shows (and plays) its preview
 * without leaving the page.
 */
export function BeatPreviewTrack({
  beat,
  durationSec,
  className,
}: {
  beat: PlayerBeat;
  durationSec?: number;
  /** Extra classes for the wrapper (e.g. card padding / divider). */
  className?: string;
}) {
  const player = usePlayer();
  const isCurrent = player.current?.id === beat.id;
  const playing = isCurrent && player.isPlaying;
  const hasAudio = Boolean(beat.audioUrl);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const [width, setWidth] = useState(0);
  // Peaks start empty so server and client markup match; cached values are
  // picked up by the loader below on the first client render.
  const [peaks, setPeaks] = useState<number[] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    hasAudio ? "idle" : "error",
  );

  /* -------------------------------------------- decode waveform when visible */
  useEffect(() => {
    if (!hasAudio || peaks) return;
    const el = trackRef.current;
    if (!el) return;

    let cancelled = false;
    const start = async () => {
      setState("loading");
      try {
        const decoded = await loadPeaks(beat.audioUrl, BARS);
        if (cancelled) return;
        setPeaks(decoded);
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      void start();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          void start();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [beat.audioUrl, hasAudio, peaks]);

  /* --------------------------------- keep bars readable on narrow rows */
  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const duration = isCurrent && player.duration > 0 ? player.duration : (durationSec ?? 0);
  const progress = isCurrent ? Math.min(1, Math.max(0, player.progress)) : 0;
  const elapsed = isCurrent ? player.currentTime : 0;

  /* ------------------------------------- apply a seek made before load/play */
  useEffect(() => {
    if (!isCurrent || pendingSeek.current == null || !(player.duration > 0)) return;
    player.seek(pendingSeek.current);
    pendingSeek.current = null;
  }, [isCurrent, player, player.duration]);

  const seekTo = useCallback(
    (ratio: number) => {
      const clamped = Math.min(1, Math.max(0, ratio));
      if (isCurrent) {
        player.seek(clamped);
        return;
      }
      pendingSeek.current = clamped;
      player.play(beat);
    },
    [beat, isCurrent, player],
  );

  function ratioFromEvent(clientX: number, el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    if (!rect.width) return 0;
    return (clientX - rect.left) / rect.width;
  }

  function toggle() {
    if (!hasAudio) return;
    if (isCurrent) player.toggle();
    else player.play(beat);
  }

  const bars = useMemo(() => downsample(peaks ?? skeletonBars, barStep(width)), [peaks, width]);

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className ?? "mt-2.5"}`}>
      <button
        type="button"
        onClick={toggle}
        disabled={!hasAudio}
        aria-label={playing ? `Pause preview of ${beat.title}` : `Play preview of ${beat.title}`}
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-all ${
          hasAudio
            ? "border-line-2 bg-panel-2 text-white hover:border-brand/60 hover:text-violet-200"
            : "cursor-not-allowed border-line bg-panel-2/60 text-muted-2"
        }`}
      >
        {playing ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {!hasAudio ? (
        <p className="text-[11px] text-muted-2">No preview file uploaded yet.</p>
      ) : state === "error" ? (
        <p className="text-[11px] text-rose-300/80">Preview unavailable for this beat.</p>
      ) : (
        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label={`Seek preview of ${beat.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seekTo(ratioFromEvent(event.clientX, event.currentTarget));
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) seekTo(ratioFromEvent(event.clientX, event.currentTarget));
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              seekTo(progress + (event.key === "ArrowRight" ? 0.05 : -0.05));
            } else if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              toggle();
            }
          }}
          className="relative h-8 min-w-0 flex-1 cursor-pointer rounded-md"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center gap-[2px]">
            {bars.map((peak, index) => (
              <span
                key={index}
                className={`flex-1 rounded-full ${
                  state === "ready" ? "bg-[rgba(148,150,180,0.28)]" : "animate-pulse bg-line-2/70"
                }`}
                style={{ height: `${Math.max(8, peak * 100)}%` }}
              />
            ))}
          </div>

          {state === "ready" && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center gap-[2px]"
              style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
            >
              {bars.map((peak, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full bg-gradient-to-b from-brand to-brand-2"
                  style={{ height: `${Math.max(8, peak * 100)}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <span className="hidden shrink-0 font-mono text-[11px] tabular-nums text-muted-2 sm:block">
        {formatDuration(isCurrent ? elapsed : 0)} / {formatDuration(duration)}
      </span>
    </div>
  );
}

/** Static placeholder shown until the real waveform finishes decoding. */
const skeletonBars = Array.from({ length: BARS }, (_, i) => 0.22 + 0.5 * Math.abs(Math.sin((i + 1) * 0.55)));

/** Narrow rows can't show every bar — group them so each bar stays visible. */
function barStep(width: number) {
  if (!width) return 1;
  if (width < 260) return 3;
  if (width < 420) return 2;
  return 1;
}

function downsample(peaks: number[], step: number) {
  if (step <= 1) return peaks;
  const out: number[] = [];
  for (let i = 0; i < peaks.length; i += step) {
    let sum = 0;
    let count = 0;
    for (let j = i; j < Math.min(i + step, peaks.length); j++) {
      sum += peaks[j];
      count += 1;
    }
    out.push(sum / Math.max(1, count));
  }
  return out;
}
