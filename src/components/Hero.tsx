"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AudioBars } from "./AudioBars";
import { formatCount, formatMoney } from "@/lib/format";

export interface HeroBeat {
  slug: string;
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  priceCents: number;
  artwork: string;
  audioUrl: string;
}

const BAR_COLOR_TOP = "#a78bfa";
const BAR_COLOR_BOTTOM = "#22d3ee";

export function Hero({
  featured,
  genres,
  currencySymbol,
  currency,
  beatCount,
  artistCount,
  deliveredCount,
}: {
  featured: HeroBeat | null;
  genres: string[];
  currencySymbol: string;
  currency: string;
  beatCount: number;
  artistCount: number;
  deliveredCount: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelsRef = useRef<number[]>([]);
  const [playing, setPlaying] = useState(false);

  /* ---------------------------------------------------------- visualizer */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const freqData = new Uint8Array(256);

    const draw = (time: number) => {
      raf = requestAnimationFrame(draw);
      if (!width || !height) return;
      const gap = 3;
      const barWidth = 6;
      const count = Math.max(12, Math.floor(width / (barWidth + gap)));
      const totalWidth = count * barWidth + (count - 1) * gap;
      const startX = (width - totalWidth) / 2;
      const baseline = height * 0.78;

      if (levelsRef.current.length !== count) {
        levelsRef.current = new Array(count).fill(0.08);
      }
      const levels = levelsRef.current;

      const analyser = analyserRef.current;
      const active = Boolean(analyser) && playing;
      if (analyser && active) {
        analyser.getByteFrequencyData(freqData as Uint8Array<ArrayBuffer>);
      }

      ctx.clearRect(0, 0, width, height);

      // baseline glow
      const lineGradient = ctx.createLinearGradient(0, 0, width, 0);
      lineGradient.addColorStop(0, "rgba(124,58,237,0)");
      lineGradient.addColorStop(0.5, "rgba(167,139,250,0.55)");
      lineGradient.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = lineGradient;
      ctx.fillRect(0, baseline, width, 1);

      for (let i = 0; i < count; i++) {
        let target: number;
        if (active && analyser) {
          // map bars onto the lower 70% of the spectrum (where the music lives)
          const idx = Math.floor((i / count) * freqData.length * 0.7);
          const next = Math.floor(((i + 1) / count) * freqData.length * 0.7);
          let sum = 0;
          for (let j = idx; j < Math.max(idx + 1, next); j++) sum += freqData[j] ?? 0;
          const avg = sum / Math.max(1, next - idx);
          target = Math.pow(avg / 255, 1.35) * 0.96 + 0.04;
        } else {
          // calm, musical idle animation
          const t = time / 1000;
          const wave =
            Math.sin(t * 1.6 + i * 0.35) * 0.5 +
            Math.sin(t * 0.9 + i * 0.11) * 0.3 +
            Math.sin(t * 2.7 + i * 0.05) * 0.2;
          const center = 1 - Math.abs(i - count / 2) / (count / 2);
          target = Math.max(0.05, (0.3 + center * 0.35) + wave * 0.22 * (0.4 + center));
        }
        levels[i] += (Math.min(target, 1) - levels[i]) * (active ? 0.35 : 0.12);

        const barHeight = Math.max(3, levels[i] * (height * 0.7));
        const x = startX + i * (barWidth + gap);
        const grad = ctx.createLinearGradient(0, baseline - barHeight, 0, baseline);
        grad.addColorStop(0, BAR_COLOR_TOP);
        grad.addColorStop(1, BAR_COLOR_BOTTOM);
        ctx.fillStyle = grad;
        roundedBar(ctx, x, baseline - barHeight, barWidth, barHeight, 3);

        // reflection
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = BAR_COLOR_BOTTOM;
        roundedBar(ctx, x, baseline + 2, barWidth, Math.min(barHeight * 0.4, 26), 3);
        ctx.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [playing]);

  /* -------------------------------------------------------------- demo audio */
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      void ctxRef.current?.close().catch(() => {});
    };
  }, []);

  async function toggleDemo() {
    if (!featured?.audioUrl) return;
    const audio = audioRef.current ?? new Audio(featured.audioUrl);
    audioRef.current = audio;
    audio.loop = true;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      if (!ctxRef.current) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = new Ctor();
        const source = actx.createMediaElementSource(audio);
        const analyser = actx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.78;
        source.connect(analyser);
        analyser.connect(actx.destination);
        ctxRef.current = actx;
        analyserRef.current = analyser;
      }
      await ctxRef.current.resume();
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }

  return (
    <section className="mesh grain relative overflow-hidden">
      {/* animated background blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[26rem] w-[26rem] animate-blob bg-brand/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-10 h-[22rem] w-[22rem] animate-blob bg-brand-2/20 blur-3xl [animation-delay:-7s]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-[18rem] w-[18rem] animate-blob bg-brand-3/15 blur-3xl [animation-delay:-13s]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #2a2a48 1px, transparent 1px), linear-gradient(to bottom, #2a2a48 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-20 lg:pt-20">
        {/* ---------------------------------------------------------- copy */}
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-panel/70 px-3 py-1.5 text-xs font-semibold text-muted backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Studio open · beats delivered in minutes
          </span>

          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Beats that hit different,
            <br />
            <span className="text-gradient">delivered straight to your inbox.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Preview every instrumental, pick your license, pay with{" "}
            <strong className="font-semibold text-white">mobile money</strong> or a{" "}
            <strong className="font-semibold text-white">bank transfer</strong> — and the moment payment
            clears, your files arrive by email. No waiting, no chasing.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/beats" className="btn btn-primary px-5 py-3 text-sm">
              Browse the beat store
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </Link>
            <button
              onClick={toggleDemo}
              disabled={!featured?.audioUrl}
              className="btn btn-ghost px-5 py-3 text-sm"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2">
                {playing ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
              {playing ? "Pause demo" : "Play the demo"}
              <AudioBars playing={playing} className="h-3.5" />
            </button>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {[
              { label: "Mobile money", tone: "text-emerald-300", dot: "bg-emerald-400" },
              { label: "Bank transfer", tone: "text-sky-300", dot: "bg-sky-400" },
              { label: "Instant email delivery", tone: "text-violet-300", dot: "bg-violet-400" },
            ].map((item) => (
              <span key={item.label} className="chip">
                <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                <span className={item.tone}>{item.label}</span>
              </span>
            ))}
          </div>

          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4">
            <HeroStat value={beatCount} label="Beats in the vault" />
            <HeroStat value={artistCount} label="Artists served" />
            <HeroStat value={deliveredCount} label="Files delivered" />
          </dl>
        </div>

        {/* --------------------------------------------------------- studio deck */}
        <div className="relative animate-fade-up [animation-delay:0.15s]">
          <div className="glass relative rounded-3xl p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-2">
                  Live preview
                </span>
              </div>
              <span className="chip">{featured ? `${featured.bpm} BPM · ${featured.musicalKey}` : "—"}</span>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-line-2 bg-panel-2">
                  {featured?.artwork ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={featured.artwork} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-lg font-black text-white/20">BF</div>
                  )}
                </div>
                <div
                  className={`pointer-events-none absolute -right-2 -bottom-2 grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-ink ${playing ? "animate-spin-slow" : ""}`}
                >
                  <div className="grid h-3 w-3 place-items-center rounded-full bg-ink">
                    <div className="h-1 w-1 rounded-full bg-white/70" />
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-white">{featured?.title ?? "Featured beat"}</p>
                <p className="truncate text-xs text-muted">
                  {featured ? `${featured.genre} · lease from ${formatMoney(featured.priceCents, currency, currencySymbol)}` : "Upload beats in the admin studio"}
                </p>
                {featured && (
                  <Link href={`/beats/${featured.slug}`} className="link mt-1 inline-block text-xs font-semibold">
                    View beat &amp; licenses →
                  </Link>
                )}
              </div>
            </div>

            <canvas ref={canvasRef} className="mt-4 h-32 w-full sm:h-40" aria-hidden />

            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-2">
              <span>{playing ? "Analysing audio…" : "Tap play to hear the studio demo"}</span>
              <span className="font-mono">44.1 kHz · 24-bit</span>
            </div>
          </div>

          {/* floating cards */}
          <div className="absolute -right-3 -top-8 hidden w-44 animate-float rounded-2xl border border-line-2 bg-panel/90 p-3 shadow-xl shadow-black/40 backdrop-blur-md sm:block">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-bold text-white">Payment confirmed</p>
                <p className="text-[10px] text-muted-2">files sent by email</p>
              </div>
            </div>
          </div>

          <div className="absolute -left-4 bottom-10 hidden w-48 animate-float-slow rounded-2xl border border-line-2 bg-panel/90 p-3 shadow-xl shadow-black/40 backdrop-blur-md md:block [animation-delay:-3s]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-2">Mobile money</p>
            <p className="mt-1 text-sm font-extrabold text-white">MTN · Telecel · Airtel</p>
            <div className="mt-2 flex items-center gap-1">
              {[35, 60, 45, 80, 55, 70, 40].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-equalize rounded-full bg-gradient-to-t from-brand to-brand-2"
                  style={{ height: `${h * 0.4}px`, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* genre marquee */}
      <div className="relative border-y border-line bg-ink/50 py-3 backdrop-blur">
        <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap">
          {[...genres, ...genres, ...genres].map((genre, i) => (
            <span key={`${genre}-${i}`} className="flex items-center gap-8 text-sm font-bold uppercase tracking-[0.2em] text-muted-2">
              {genre}
              <span className="h-1.5 w-1.5 rounded-full bg-brand/70" />
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-ink to-transparent" />
      </div>
    </section>
  );
}

function roundedBar(
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

function HeroStat({ value, label }: { value: number; label: string }) {
  const display = useCountUp(value);
  return (
    <div>
      <dt className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        {formatCount(display)}
        <span className="text-brand-2">+</span>
      </dt>
      <dd className="mt-1 text-[11px] font-medium leading-snug text-muted-2">{label}</dd>
    </div>
  );
}

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
