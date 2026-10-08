import { badRequest, bool, cents, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";
import { removeUpload, saveUpload, UploadError } from "@/lib/upload";

type BeatPatch = Record<string, unknown>;

function applyPatch(beat: ReturnType<typeof db>["beats"][number], body: BeatPatch) {
  if (body.title !== undefined) {
    const title = str(body.title);
    if (!title) throw new Error("Give the beat a title.");
    beat.title = title;
  }
  if (body.genre !== undefined) beat.genre = str(body.genre) || beat.genre;
  if (body.bpm !== undefined) beat.bpm = int(body.bpm, beat.bpm);
  if (body.musicalKey !== undefined) beat.musicalKey = str(body.musicalKey) || beat.musicalKey;
  if (body.mood !== undefined) beat.mood = str(body.mood) || beat.mood;
  if (body.priceCents !== undefined) beat.priceCents = Math.max(0, int(body.priceCents, beat.priceCents));
  if (body.price !== undefined) {
    const next = cents(body.price);
    if (next) beat.priceCents = next;
  }
  if (body.description !== undefined) beat.description = str(body.description);
  if (body.tags !== undefined) {
    beat.tags = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : str(body.tags)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
  }
  if (body.published !== undefined) beat.published = Boolean(body.published);
  if (body.featured !== undefined) beat.featured = Boolean(body.featured);
  if (body.removeArtwork) {
    removeUpload(beat.artwork);
    beat.artwork = null;
  }
}

/** Admin updates beat metadata (JSON or multipart, including artwork replacement). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const beat = db().beats.find((b) => b.id === id);
    if (!beat) return badRequest("Beat not found.");

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const body: BeatPatch = {
        title: str(form.get("title")),
        genre: str(form.get("genre")),
        bpm: str(form.get("bpm")),
        musicalKey: str(form.get("key")),
        mood: str(form.get("mood")),
        price: str(form.get("price")),
        description: str(form.get("description")),
        tags: str(form.get("tags")),
        published: bool(form.get("published")),
        featured: bool(form.get("featured")),
      };
      for (const [key, value] of Object.entries(body)) {
        if (value === "" && key !== "title") delete body[key];
      }
      applyPatch(beat, body);

      const artwork = form.get("artwork");
      if (artwork instanceof File && artwork.size > 0) {
        try {
          const saved = await saveUpload(artwork, "image", artwork.name);
          removeUpload(beat.artwork);
          beat.artwork = saved.path;
        } catch (err) {
          if (!(err instanceof UploadError)) throw err;
          return badRequest(err.message);
        }
      }
    } else {
      const body = (await request.json()) as BeatPatch;
      applyPatch(beat, body);
    }

    persist("beats");
    return Response.json({ ok: true, beat });
  } catch (err) {
    return serverError(err, "admin update beat");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const data = db();
    const index = data.beats.findIndex((b) => b.id === id);
    if (index === -1) return badRequest("Beat not found.");

    const [beat] = data.beats.splice(index, 1);
    for (const file of beat.files) removeUpload(file.path);
    removeUpload(beat.artwork);
    persist("beats");
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err, "admin delete beat");
  }
}
