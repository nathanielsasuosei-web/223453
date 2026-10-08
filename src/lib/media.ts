/**
 * Client-safe media helpers (no node built-ins, no "server-only" imports).
 * Safe to import from both server and client components.
 */
import type { PlayerBeat } from "@/components/PlayerProvider";
import type { Beat } from "./store";

export const GENRES = [
  "Afrobeats",
  "Amapiano",
  "Hip-Hop",
  "Trap",
  "R&B",
  "Dancehall",
  "Drill",
  "Pop",
  "Gospel",
  "Highlife",
  "Lofi",
  "Afro-Drill",
];

const AUDIO_KINDS = ["MP3", "WAV", "OGG", "M4A", "FLAC", "AIFF"];

/** The file visitors can preview (tagged MP3 first, then any audio). */
export function previewFile(beat: Beat) {
  return beat.files.find((f) => f.kind === "MP3") ?? beat.files.find((f) => AUDIO_KINDS.includes(f.kind)) ?? null;
}

export function audioUrl(beat: Beat) {
  const file = previewFile(beat);
  return file ? publicUrl(file.path) : "";
}

export function artworkUrl(beat: Beat) {
  return publicUrl(beat.artwork);
}

export function toPlayerBeat(beat: Beat): PlayerBeat {
  return {
    id: beat.id,
    slug: beat.slug,
    title: beat.title,
    genre: beat.genre,
    bpm: beat.bpm,
    musicalKey: beat.musicalKey,
    priceCents: beat.priceCents,
    artwork: artworkUrl(beat),
    audioUrl: audioUrl(beat),
    durationSec: beat.durationSec,
  };
}

/** Public URL used to stream an uploaded asset (supports HTTP ranges). */
export function publicUrl(relPath: string | null | undefined) {
  if (!relPath) return "";
  return `/api/files/${relPath.split("/").map(encodeURIComponent).join("/")}`;
}
