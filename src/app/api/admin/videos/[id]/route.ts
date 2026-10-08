import { badRequest, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";
import { removeUpload } from "@/lib/upload";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const video = db().videos.find((v) => v.id === id);
    if (!video) return badRequest("Video not found.");

    const body = await request.json();
    if (body.title !== undefined) {
      const title = str(body.title);
      if (!title) return badRequest("Give the video a title.");
      video.title = title;
    }
    if (body.description !== undefined) video.description = str(body.description);
    if (body.durationSec !== undefined) video.durationSec = int(body.durationSec, video.durationSec);
    if (body.published !== undefined) video.published = Boolean(body.published);
    if (body.removePoster) {
      removeUpload(video.poster);
      video.poster = null;
    }

    persist("videos");
    return Response.json({ ok: true, video });
  } catch (err) {
    return serverError(err, "admin update video");
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
    const index = data.videos.findIndex((v) => v.id === id);
    if (index === -1) return badRequest("Video not found.");

    const [video] = data.videos.splice(index, 1);
    removeUpload(video.path);
    removeUpload(video.poster);
    persist("videos");
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err, "admin delete video");
  }
}
