/**
 * Waveform peaks for beat previews.
 *
 * Peaks are decoded from the real audio file with the Web Audio API, then
 * cached in memory so every listing that shows the same preview (store list,
 * home page, beat detail) only downloads and decodes it once.
 *
 * Decoding is queued with a small concurrency limit so a page full of beat
 * previews never fires a dozen full-file downloads at once.
 */

const cache = new Map<string, number[]>();
const inflight = new Map<string, Promise<number[]>>();

type Task = () => void;
const waiting: Task[] = [];
let active = 0;
const MAX_CONCURRENT = 2;

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1;
      job().then(resolve, reject).finally(() => {
        active -= 1;
        const next = waiting.shift();
        if (next) next();
      });
    };
    if (active < MAX_CONCURRENT) run();
    else waiting.push(run);
  });
}

/** Peaks already decoded for this source (no fetch, no decode). */
export function cachedPeaks(src: string, buckets: number) {
  if (!src) return null;
  return cache.get(peaksKey(src, buckets)) ?? readStored(src, buckets);
}

/**
 * Fetch + decode `src` and return `buckets` normalised peak values (0–1).
 * Results are cached in memory and in localStorage, and concurrent callers
 * share a single request.
 */
export function loadPeaks(src: string, buckets = 96): Promise<number[]> {
  if (!src) return Promise.reject(new Error("missing audio source"));
  const key = peaksKey(src, buckets);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);

  const stored = readStored(src, buckets);
  if (stored) {
    cache.set(key, stored);
    return Promise.resolve(stored);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = enqueue(() => decodePeaks(src, buckets))
    .then((peaks) => {
      cache.set(key, peaks);
      storePeaks(src, buckets, peaks);
      inflight.delete(key);
      return peaks;
    })
    .catch((error: unknown) => {
      inflight.delete(key);
      throw error;
    });

  inflight.set(key, job);
  return job;
}

/* ------------------------------------------------------- localStorage cache */

const STORE_PREFIX = "beatforge:peaks:v1:";
const STORE_LIMIT = 240;

/** Peaks are tiny (one byte per bucket) — keeping them avoids re-downloading previews. */
function readStored(src: string, buckets: number): number[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORE_PREFIX + peaksKey(src, buckets));
    if (!raw) return null;
    const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
    if (bytes.length !== buckets) return null;
    return Array.from(bytes, (byte) => byte / 255);
  } catch {
    return null;
  }
}

function storePeaks(src: string, buckets: number, peaks: number[]) {
  if (typeof window === "undefined") return;
  try {
    const bytes = Uint8Array.from(peaks, (peak) => Math.max(0, Math.min(255, Math.round(peak * 255))));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const storage = window.localStorage;
    const key = STORE_PREFIX + peaksKey(src, buckets);
    storage.setItem(key, btoa(binary));
    trimStore(storage);
  } catch {
    /* storage full or unavailable — peaks simply stay in memory */
  }
}

function trimStore(storage: Storage) {
  let keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(STORE_PREFIX)) keys.push(key);
  }
  if (keys.length <= STORE_LIMIT) return;
  keys = keys.slice(0, keys.length - STORE_LIMIT);
  for (const key of keys) storage.removeItem(key);
}

async function decodePeaks(src: string, buckets: number): Promise<number[]> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`preview request failed (${res.status})`);
  const buffer = await res.arrayBuffer();
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  try {
    const audio = await ctx.decodeAudioData(buffer);
    return computePeaks(audio, buckets);
  } finally {
    void ctx.close();
  }
}

/** Root-mean-square envelope of an audio buffer, normalised to 0–1. */
export function computePeaks(buffer: AudioBuffer, buckets: number): number[] {
  const channel = buffer.getChannelData(0);
  const block = Math.floor(channel.length / buckets) || 1;
  const peaks: number[] = [];
  let max = 0.0001;
  const stride = Math.max(1, Math.floor(block / 220));
  for (let i = 0; i < buckets; i++) {
    const start = i * block;
    let sum = 0;
    let samples = 0;
    for (let j = 0; j < block; j += stride) {
      const v = channel[start + j] ?? 0;
      sum += v * v;
      samples += 1;
    }
    const rms = Math.sqrt(sum / Math.max(1, samples));
    peaks.push(rms);
    if (rms > max) max = rms;
  }
  // Gamma >1 keeps the loud/quiet contrast visible instead of flattening every
  // bar to full height (these previews are already mastered and compressed).
  return peaks.map((p) => Math.min(1, Math.pow(p / max, 2) * 0.92 + 0.06));
}

function peaksKey(src: string, buckets: number) {
  return `${buckets}:${src}`;
}
