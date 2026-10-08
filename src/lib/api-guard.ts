import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";

/** Admin guard for API routes. Returns either the admin or a ready-made error response. */
export async function requireAdminApi() {
  const current = await getCurrentUser();
  if (!current) {
    return { error: NextResponse.json({ error: "Please log in as the producer." }, { status: 401 }) };
  }
  if (current.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "This area is for the producer's admin account." }, { status: 403 }) };
  }
  return { admin: { id: current.user.id, name: current.user.name, email: current.user.email } };
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function serverError(err: unknown, label: string) {
  console.error(`[${label}]`, err);
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return NextResponse.json({ error: message }, { status: err instanceof Error && /not found/i.test(message) ? 404 : 500 });
}

/* ------------------------------------------------------------ form helpers */

export function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function int(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : fallback;
  const n = Number(str(value));
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/** "29.99" → 2999 */
export function cents(value: unknown): number {
  const n = Number(str(value));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function bool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const s = str(value).toLowerCase();
  return s === "true" || s === "on" || s === "1" || s === "yes";
}

/** Rough duration estimate so the store can show track length without decoding. */
export function estimateDuration(ext: string, bytes: number): number {
  const e = ext.toLowerCase();
  if (e === ".mp3" || e === ".m4a" || e === ".aac") return Math.round(bytes / 16000); // ~128kbps
  if (e === ".ogg" || e === ".opus") return Math.round(bytes / 12000);
  if (e === ".flac") return Math.round(bytes / 700000);
  if (e === ".wav" || e === ".aiff") return Math.round(bytes / 176400); // 16-bit 44.1k stereo
  return 0;
}

export function kindFromExt(ext: string): "MP3" | "WAV" | "STEMS" | "ARTWORK" | "OTHER" {
  const e = ext.toLowerCase();
  if (e === ".mp3" || e === ".m4a" || e === ".aac") return "MP3";
  if (e === ".wav" || e === ".aiff" || e === ".flac") return "WAV";
  if (e === ".zip") return "STEMS";
  return "OTHER";
}
