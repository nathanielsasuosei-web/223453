/**
 * Tiny synthesizer used to generate the demo beats shipped with the seed.
 * Everything is generated from scratch (no samples) and written as 16-bit WAV.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SR = 44100;

/* ------------------------------------------------------------------ helpers */

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEMITONE = Math.pow(2, 1 / 12);
const note = (semitonesFromA4) => 440 * Math.pow(SEMITONE, semitonesFromA4);

/* ------------------------------------------------------------------- voices */

function kick(L, R, start) {
  let phase = 0;
  const dur = Math.floor(0.42 * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const f = 48 + 130 * Math.exp(-t * 30);
    phase += (2 * Math.PI * f) / SR;
    const amp = Math.exp(-t * 6.2) * (1 - Math.exp(-t * 500));
    const s = Math.sin(phase) * amp * 0.95;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s;
    R[idx] += s;
  }
}

function snare(L, R, start, gain = 0.45) {
  let phase = 0;
  let lp = 0;
  const dur = Math.floor(0.24 * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const n = Math.random() * 2 - 1;
    lp += (n - lp) * 0.4;
    const hp = n - lp;
    phase += (2 * Math.PI * 188) / SR;
    const amp = Math.exp(-t * 20);
    const s = (hp * 0.85 + Math.sin(phase) * 0.3) * amp * gain;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s;
    R[idx] += s * 0.92;
  }
}

function hat(L, R, start, open = false, pan = 0) {
  let prev = 0;
  const dur = Math.floor((open ? 0.3 : 0.055) * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const n = Math.random() * 2 - 1;
    const hp = n - prev;
    prev = n;
    const amp = Math.exp(-t * (open ? 13 : 58));
    const s = hp * amp * 0.22;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s * (1 - pan * 0.6);
    R[idx] += s * (1 + pan * 0.6);
  }
}

function shaker(L, R, start) {
  let prev = 0;
  const dur = Math.floor(0.05 * SR);
  for (let i = 0; i < dur; i++) {
    const t = i / SR;
    const n = Math.random() * 2 - 1;
    const hp = n - prev;
    prev = n;
    const amp = Math.exp(-t * 70);
    const s = hp * amp * 0.13;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s * 0.8;
    R[idx] += s * 1.2;
  }
}

function bass(L, R, start, freq, dur, slide = 0, gain = 0.5) {
  let phase = 0;
  let lp = 0;
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const progress = t / dur;
    const f = slide ? freq * (1 + slide * (1 - progress)) : freq;
    phase += (2 * Math.PI * f) / SR;
    const amp = Math.min(1, t * 60) * Math.exp(-t * 1.5) * gain;
    const raw = Math.sin(phase) + 0.22 * Math.sin(phase * 2) + 0.06 * Math.sin(phase * 3);
    lp += (raw - lp) * 0.24; // warm low-pass
    const s = lp * amp;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s;
    R[idx] += s;
  }
}

function pad(L, R, start, freqs, dur, gain = 0.1) {
  const n = Math.floor(dur * SR);
  const phases = freqs.map(() => 0);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env =
      Math.min(1, t / 0.35) * Math.min(1, (dur - t) / 0.5) * (t > 0.05 ? 1 : t / 0.05);
    let s = 0;
    for (let v = 0; v < freqs.length; v++) {
      const detune = 1 + (v % 2 === 0 ? 0.0015 : -0.0015);
      phases[v] += (2 * Math.PI * freqs[v] * detune) / SR;
      s += Math.sin(phases[v]);
    }
    s = (s / freqs.length) * env * gain;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s * 0.9;
    R[idx] += s;
  }
}

function pluck(L, R, start, freq, dur = 0.5, gain = 0.16) {
  let phase = 0;
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * freq) / SR;
    const amp = Math.exp(-t * 4.5) * (1 - Math.exp(-t * 300)) * gain;
    const s = (Math.sin(phase) + 0.35 * Math.sin(phase * 2) + 0.12 * Math.sin(phase * 3)) * amp;
    const idx = start + i;
    if (idx >= L.length) break;
    L[idx] += s * 0.75;
    R[idx] += s;
  }
}

/* ----------------------------------------------------------------- patterns */

const PATTERNS = {
  afrobeats: {
    kick: [0, 6, 10],
    snare: [4, 12],
    hats: "8ths",
    shaker: true,
    bass: [0, 3, 6, 10, 14],
    bassSlide: 0.12,
    chords: true,
    lead: true,
    swing: 0,
  },
  amapiano: {
    kick: [0, 6, 10],
    snare: [4, 12],
    hats: "8ths",
    shaker: true,
    bass: [0, 4, 8, 12],
    bassSlide: 0.08,
    chords: true,
    lead: true,
    swing: 0.06,
  },
  trap: {
    kick: [0, 6, 10],
    snare: [4, 12],
    hats: "16ths",
    shaker: false,
    bass: [0, 10],
    bassSlide: 0.35,
    chords: true,
    lead: true,
    swing: 0,
  },
  drill: {
    kick: [0, 4, 10],
    snare: [4, 12],
    hats: "16ths",
    shaker: false,
    bass: [0, 7, 10],
    bassSlide: 0.5,
    chords: false,
    lead: true,
    swing: 0,
  },
  rnb: {
    kick: [0, 10],
    snare: [4, 12],
    hats: "8ths",
    shaker: false,
    bass: [0, 8],
    bassSlide: 0.05,
    chords: true,
    lead: true,
    swing: 0.04,
  },
  lofi: {
    kick: [0, 10],
    snare: [4, 12],
    hats: "8ths",
    shaker: false,
    bass: [0, 8],
    bassSlide: 0.05,
    chords: true,
    lead: false,
    swing: 0.08,
  },
};

/** Minor-pentatonic-ish scale degrees (semitones) used for bass and lead lines. */
const SCALE = [0, 3, 5, 7, 10, 12, 15];

export function synthesizeBeat({ bpm, bars = 4, genre = "afrobeats", root = -24, seed = 7 }) {
  const pattern = PATTERNS[genre] ?? PATTERNS.afrobeats;
  const rnd = mulberry32(seed);
  const stepDur = 60 / bpm / 4;
  const totalSteps = bars * 16;
  const length = Math.ceil((totalSteps * stepDur + 1.2) * SR);
  const L = new Float32Array(length);
  const R = new Float32Array(length);

  const rootFreq = note(root); // A1-ish
  const chordFreqs = [0, 3, 7, 10, 14].map((s) => note(root + 24 + s)); // two octaves up

  for (let step = 0; step < totalSteps; step++) {
    const inBar = step % 16;
    const bar = Math.floor(step / 16);
    const swing = pattern.swing && inBar % 2 === 1 ? pattern.swing * stepDur : 0;
    const time = step * stepDur + swing + 0.02;

    if (pattern.kick.includes(inBar)) kick(L, R, Math.floor(time * SR));
    if (pattern.snare.includes(inBar)) snare(L, R, Math.floor(time * SR), bar % 4 === 3 ? 0.5 : 0.42);

    if (pattern.hats === "16ths") {
      hat(L, R, Math.floor(time * SR), inBar === 14 && bar % 2 === 1, rnd() * 0.8 - 0.4);
    } else if (inBar % 2 === 0) {
      hat(L, R, Math.floor(time * SR), inBar === 6, rnd() * 0.6 - 0.3);
    }
    if (pattern.shaker && inBar % 2 === 1) shaker(L, R, Math.floor(time * SR));

    // bass line
    if (pattern.bass.includes(inBar)) {
      const degree = SCALE[Math.floor(rnd() * SCALE.length)];
      const slide = rnd() < 0.35 ? pattern.bassSlide : 0;
      bass(L, R, Math.floor(time * SR), rootFreq * Math.pow(SEMITONE, degree % 12), stepDur * 3, slide);
    }

    // chords at the top of each bar
    if (pattern.chords && inBar === 0) {
      const variation = bar % 2 === 0 ? [0, 3, 7, 10] : [0, 5, 7, 12];
      pad(L, R, Math.floor(time * SR), variation.map((s) => note(root + 24 + s)), stepDur * 15, 0.085);
    }

    // lead melody on the last two bars
    if (pattern.lead && bar >= bars - 2 && inBar % 2 === 0 && rnd() < 0.75) {
      const degree = SCALE[Math.floor(rnd() * 6)] + (rnd() < 0.3 ? 12 : 0);
      pluck(L, R, Math.floor(time * SR), note(root + 36 + degree), stepDur * (rnd() < 0.3 ? 4 : 2), 0.13);
    }
  }

  // cheap stereo reverb: a couple of delayed, decaying copies
  const reverb = (delaySec, gain) => {
    const d = Math.floor(delaySec * SR);
    for (let i = d; i < length; i++) {
      L[i] += R[i - d] * gain;
      R[i] += L[i - d] * gain;
    }
  };
  reverb(0.11, 0.16);
  reverb(0.23, 0.09);

  // master: soft clip + normalize + fades
  let peak = 0;
  for (let i = 0; i < length; i++) {
    L[i] = Math.tanh(L[i] * 1.15) * 0.92;
    R[i] = Math.tanh(R[i] * 1.15) * 0.92;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = peak > 0 ? 0.89 / peak : 1;
  const fadeIn = Math.floor(0.02 * SR);
  const fadeOut = Math.floor(0.7 * SR);
  for (let i = 0; i < length; i++) {
    let g = norm;
    if (i < fadeIn) g *= i / fadeIn;
    const tail = length - i;
    if (tail < fadeOut) g *= tail / fadeOut;
    L[i] *= g;
    R[i] *= g;
  }

  return { left: L, right: R, sampleRate: SR, durationSec: length / SR };
}

/** Writes a 16-bit PCM WAV file. */
export function writeWav(filePath, { left, right, sampleRate }) {
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = left.length * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28);
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < left.length; i++) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(left[i] * 32767))), offset);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(right[i] * 32767))), offset + 2);
    offset += 4;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return buffer.length;
}

/** Encodes a WAV to MP3 with ffmpeg (128 kbps). */
export function encodeMp3(ffmpeg, wavPath, mp3Path) {
  fs.mkdirSync(path.dirname(mp3Path), { recursive: true });
  execFileSync(
    ffmpeg,
    ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "128k", "-ar", "44100", mp3Path],
    { stdio: "pipe" },
  );
  return fs.statSync(mp3Path).size;
}
