import { badRequest, bool, cents, estimateDuration, int, kindFromExt, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { saveUpload, UploadError } from "@/lib/upload";
import { db, persist, uid, uniqueSlug } from "@/lib/store";

/** Admin: create a beat with artwork + audio files. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const form = await request.formData();
    const title = str(form.get("title"));
    if (!title) return badRequest("Give the beat a title.");

    const data = db();
    const tiers: string[] = (() => {
      try {
        const raw = str(form.get("fileTiers"));
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    })();

    const beat = {
      id: uid("beat"),
      slug: uniqueSlug(title, data.beats.map((b) => b.slug)),
      title,
      genre: str(form.get("genre")) || "Afrobeats",
      bpm: int(form.get("bpm"), 0),
      musicalKey: str(form.get("key")) || "—",
      mood: str(form.get("mood")) || "—",
      priceCents: cents(form.get("price")),
      description: str(form.get("description")),
      tags: str(form.get("tags"))
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      artwork: null as string | null,
      files: [] as {
        id: string;
        name: string;
        kind: "MP3" | "WAV" | "STEMS" | "ARTWORK" | "OTHER";
        path: string;
        sizeBytes: number;
        tier: string;
      }[],
      durationSec: 0,
      plays: 0,
      sales: 0,
      published: bool(form.get("published")),
      featured: bool(form.get("featured")),
      createdAt: new Date().toISOString(),
    };

    const artwork = form.get("artwork");
    if (artwork instanceof File && artwork.size > 0) {
      try {
        const saved = await saveUpload(artwork, "image", artwork.name);
        beat.artwork = saved.path;
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        return badRequest(err.message);
      }
    }

    let duration = 0;
    for (const entry of form.getAll("files")) {
      if (!(entry instanceof File) || entry.size === 0) continue;
      try {
        const saved = await saveUpload(entry, "audio", entry.name);
        beat.files.push({
          id: uid("file"),
          name: entry.name,
          kind: kindFromExt(saved.ext),
          path: saved.path,
          sizeBytes: saved.sizeBytes,
          tier: tiers[beat.files.length] ?? "*",
        });
        if (!duration) duration = estimateDuration(saved.ext, saved.sizeBytes);
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        return badRequest(err.message);
      }
    }
    beat.durationSec = duration;

    data.beats.unshift(beat);
    persist("beats");
    return Response.json({ ok: true, id: beat.id, slug: beat.slug });
  } catch (err) {
    return serverError(err, "admin create beat");
  }
}
