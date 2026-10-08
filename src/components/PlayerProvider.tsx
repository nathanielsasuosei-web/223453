"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AudioBars } from "./AudioBars";

export interface PlayerBeat {
  id: string;
  slug: string;
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  priceCents: number;
  artwork: string;
  audioUrl: string;
  durationSec: number;
}

interface PlayerState {
  current: PlayerBeat | null;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  play: (beat: PlayerBeat) => void;
  toggle: () => void;
  stop: () => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<PlayerBeat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const play = useCallback((beat: PlayerBeat) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current?.id === beat.id) {
      if (audio.paused) {
        void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
      return;
    }
    setCurrent(beat);
    setProgress(0);
    setCurrentTime(0);
    audio.src = beat.audioUrl;
    audio.currentTime = 0;
    void audio
      .play()
      .then(() => {
        setIsPlaying(true);
        fetch(`/api/beats/${beat.id}/play`, { method: "POST" }).catch(() => {});
      })
      .catch(() => setIsPlaying(false));
  }, [current?.id]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) {
      void audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [current]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    setCurrent(null);
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }, []);

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(1, ratio)) * audio.duration;
    setProgress(Math.max(0, Math.min(1, ratio)));
    setCurrentTime(audio.currentTime);
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      current,
      isPlaying,
      progress,
      currentTime,
      duration,
      volume,
      play,
      toggle,
      stop,
      seek,
      setVolume: setVolumeState,
    }),
    [current, isPlaying, progress, currentTime, duration, volume, play, toggle, stop, seek],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrentTime(el.currentTime);
          setProgress(el.duration ? el.currentTime / el.duration : 0);
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(1);
        }}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      {current && <MiniPlayer />}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

function fmt(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MiniPlayer() {
  const player = usePlayer();
  const beat = player.current!;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
            {beat.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={beat.artwork} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-xs font-bold text-muted">BF</div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{beat.title}</p>
            <p className="truncate text-[11px] text-muted-2">
              {beat.genre} · {beat.bpm} BPM · {beat.musicalKey}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AudioBars playing={player.isPlaying} className="hidden h-6 sm:flex" />
          <button
            onClick={player.toggle}
            aria-label={player.isPlaying ? "Pause" : "Play"}
            className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-ink transition-transform hover:scale-105"
          >
            {player.isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="hidden flex-[2] items-center gap-3 md:flex">
          <span className="w-9 text-right font-mono text-[11px] text-muted-2">
            {fmt(player.currentTime)}
          </span>
          <div
            className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-line-2"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              player.seek((e.clientX - rect.left) / rect.width);
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand to-brand-2"
              style={{ width: `${player.progress * 100}%` }}
            />
            <div
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity group-hover:opacity-100"
              style={{ left: `${player.progress * 100}%` }}
            />
          </div>
          <span className="w-9 font-mono text-[11px] text-muted-2">{fmt(player.duration)}</span>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-2">
            <path d="M11 5 6 9H2v6h4l5 4V5z" />
          </svg>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={player.volume}
            onChange={(e) => player.setVolume(Number(e.target.value))}
            className="h-1 w-20 accent-violet-500"
            aria-label="Volume"
          />
        </div>

        <button
          onClick={player.stop}
          aria-label="Close player"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted-2 transition-colors hover:bg-panel-2 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
