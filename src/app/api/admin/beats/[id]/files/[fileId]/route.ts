import { badRequest, requireAdminApi, serverError } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";
import { removeUpload } from "@/lib/upload";

/** Admin removes a single audio file from a beat. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id, fileId } = await params;
    const beat = db().beats.find((b) => b.id === id);
    if (!beat) return badRequest("Beat not found.");

    const index = beat.files.findIndex((f) => f.id === fileId);
    if (index === -1) return badRequest("File not found.");

    const [file] = beat.files.splice(index, 1);
    removeUpload(file.path);
    persist("beats");
    return Response.json({ ok: true, files: beat.files });
  } catch (err) {
    return serverError(err, "admin remove beat file");
  }
}
