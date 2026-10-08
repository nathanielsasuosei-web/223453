import "server-only";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { UPLOAD_DIR, uid } from "./store";
import { publicUrl } from "./media";

export { publicUrl };

export type UploadKind = "audio" | "image" | "video" | "doc";

export const UPLOAD_RULES: Record<
  UploadKind,
  { exts: string[]; maxBytes: number; subdir: string; label: string }
> = {
  audio: {
    exts: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aiff"],
    maxBytes: 120 * 1024 * 1024,
    subdir: "beats",
    label: "audio",
  },
  image: {
    exts: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"],
    maxBytes: 10 * 1024 * 1024,
    subdir: "artwork",
    label: "image",
  },
  video: {
    exts: [".mp4", ".webm", ".mov", ".m4v"],
    maxBytes: 400 * 1024 * 1024,
    subdir: "videos",
    label: "video",
  },
  doc: {
    exts: [".pdf", ".txt", ".zip"],
    maxBytes: 40 * 1024 * 1024,
    subdir: "docs",
    label: "document",
  },
};

export class UploadError extends Error {}

export interface SavedUpload {
  /** path relative to UPLOAD_DIR, e.g. "beats/ab12.mp3" */
  path: string;
  sizeBytes: number;
  name: string;
  ext: string;
}

/** Persist a File/Blob from a multipart request. */
export async function saveUpload(
  file: File | Blob,
  kind: UploadKind,
  originalName?: string,
): Promise<SavedUpload> {
  const rule = UPLOAD_RULES[kind];
  const name = (originalName ?? (file as File).name ?? "upload").toString();
  const ext = path.extname(name).toLowerCase();
  if (!rule.exts.includes(ext)) {
    throw new UploadError(
      `Unsupported ${rule.label} format "${ext || "unknown"}". Allowed: ${rule.exts.join(", ")}`,
    );
  }
  if (file.size > rule.maxBytes) {
    throw new UploadError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max ${(rule.maxBytes / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
  const dir = path.join(UPLOAD_DIR, rule.subdir);
  fs.mkdirSync(dir, { recursive: true });
  const storedName = `${uid("f").slice(2)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, storedName), buffer);
  return {
    path: `${rule.subdir}/${storedName}`,
    sizeBytes: buffer.length,
    name: path.basename(name),
    ext,
  };
}

/** Resolve a stored relative path, refusing anything that escapes UPLOAD_DIR. */
export function resolveUploadPath(relPath: string): string | null {
  const clean = relPath.replace(/^\/+/, "").replace(/\.\./g, "");
  const abs = path.join(UPLOAD_DIR, clean);
  if (!abs.startsWith(UPLOAD_DIR + path.sep) && abs !== UPLOAD_DIR) return null;
  return fs.existsSync(abs) ? abs : null;
}

export function removeUpload(relPath: string | null | undefined) {
  if (!relPath) return;
  try {
    const abs = resolveUploadPath(relPath);
    if (abs) fs.unlinkSync(abs);
  } catch {
    /* ignore */
  }
}

export function uploadExists(relPath: string | null | undefined) {
  if (!relPath) return false;
  return resolveUploadPath(relPath) !== null;
}

export function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

const MIME: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".flac": "audio/flac",
  ".aiff": "audio/aiff",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".txt": "text/plain",
};

export function mimeFor(relPath: string) {
  return MIME[path.extname(relPath).toLowerCase()] ?? "application/octet-stream";
}

export function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);
}
