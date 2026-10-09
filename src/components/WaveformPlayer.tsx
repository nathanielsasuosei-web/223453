"use client";

import { useEffect, useRef, useState } from "react";
import { AudioBars } from "./AudioBars";
import { loadPeaks } from "@/lib/audio-peaks";
import { formatDuration } from "@/lib/format";

const BUCKETS = 180;

/**
 * Waveform preview player. The waveform is decoded from the actual audio file
 * with the Web Audio API, so what you see is what the beat sounds like.
 */
export function WaveformPlayer({
  src,
  height = 96,
  compact = false,
}: {
  src: string;
  height?: number;
  compact?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<number[]>([]);
  const progressRef = useRef(0);
  const rafRef = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  /* ------------------------------------------------------------ decode */
  useEffect(() => {
    let cancelled = false;
    async function decode() {
      if (!src) {
        setState("error");
        return;
      }
      try {
        const peaks = await loadPeaks(src, BUCKETS);
        if (cancelled) return;
        peaksRef.current = peaks;
        setState("ready");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void decode();
    return () => {
      cancelled = true;
    };
  }, [src]);

  /* ------------------------------------------------------------- draw */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || state !== "ready") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = () => {
      rafRef.current = requestAnimationFrame(render);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const peaks = peaksRef.current;
      const gap = 2;
      const barWidth = Math.max(2, (w - gap * (peaks.length - 1)) / peaks.length);
      const progress = progressRef.current;
      const mid = h / 2;

      for (let i = 0; i < peaks.length; i++) {
        const x = i * (barWidth + gap);
        const barHeight = Math.max(2, peaks[i] * (h * 0.92));
        const played = i / peaks.length <= progress;
        const grad = ctx.createLinearGradient(0, mid - barHeight / 2, 0, mid + barHeight / 2);
        if (played) {
          grad.addColorStop(0, "#a78bfa");
          grad.addColorStop(1, "#22d3ee");
        } else {
          grad.addColorStop(0, "rgba(148,150,180,0.45)");
          grad.addColorStop(1, "rgba(148,150,180,0.25)");
        }
        ctx.fillStyle = grad;
        rounded(ctx, x, mid - barHeight / 2, barWidth, barHeight, Math.min(2, barWidth / 2));
      }
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [state]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      audio.pause();
      setPlaying(false);
    }
  }

  function seekFromEvent(clientX: number, el: HTMLElement) {
    const audio = audioRef.current;
    if (!audio) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (Number.isFinite(audio.duration)) audio.currentTime = ratio * audio.duration;
    progressRef.current = ratio;
    setCurrent(ratio * (audio.duration || 0));
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          disabled={state === "error"}
          aria-label={playing ? "Pause preview" : "Play preview"}
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full transition-transform ${
            state === "error"
              ? "cursor-not-allowed bg-panel-2 text-muted-2"
              : "bg-gradient-to-br from-brand to-brand-2 text-ink hover:scale-105"
          }`}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {state === "loading" && (
            <div className="flex h-full items-center gap-2 text-xs text-muted-2">
              <span className="h-1.5 w-24 animate-shimmer rounded-full bg-gradient-to-r from-line-2 via-brand/60 to-line-2 bg-[length:200%_100%]" />
              decoding waveform…
            </div>
          )}
          {state === "error" && (
            <p className="text-xs text-rose-300">Preview unavailable for this beat.</p>
          )}
          {state === "ready" && (
            <canvas
              ref={canvasRef}
              style={{ height }}
              className="w-full cursor-pointer"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                seekFromEvent(e.clientX, e.currentTarget);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1) seekFromEvent(e.clientX, e.currentTarget);
              }}
            />
          )}
        </div>

        {!compact && (
          <div className="hidden items-center gap-2 sm:flex">
            <AudioBars playing={playing} className="h-5" />
            <span className="font-mono text-xs text-muted-2">
              {formatDuration(current)} / {formatDuration(duration)}
            </span>
          </div>
        )}
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrent(el.currentTime);
          progressRef.current = el.duration ? el.currentTime / el.duration : 0;
        }}
        onEnded={() => {
          setPlaying(false);
          progressRef.current = 1;
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
    </div>
  );
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}
