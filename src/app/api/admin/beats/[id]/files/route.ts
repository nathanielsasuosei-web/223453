import { badRequest, bool, estimateDuration, kindFromExt, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { saveUpload, UploadError } from "@/lib/upload";
import { db, persist, uid } from "@/lib/store";

/** Admin appends audio files to an existing beat. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const beat = db().beats.find((b) => b.id === id);
    if (!beat) return badRequest("Beat not found.");

    const form = await request.formData();
    const tier = str(form.get("tier")) || "*";

    const added: string[] = [];
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
          tier,
        });
        added.push(entry.name);
        if (!beat.durationSec) beat.durationSec = estimateDuration(saved.ext, saved.sizeBytes);
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        return badRequest(err.message);
      }
    }

    if (!added.length) return badRequest("Choose at least one audio file.");
    persist("beats");
    void bool;
    return Response.json({ ok: true, added, files: beat.files });
  } catch (err) {
    return serverError(err, "admin add beat files");
  }
}
