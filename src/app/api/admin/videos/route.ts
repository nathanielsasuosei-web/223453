import { badRequest, bool, estimateDuration, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { saveUpload, UploadError } from "@/lib/upload";
import { db, persist, uid } from "@/lib/store";

/** Admin: publish a video (file + optional poster). */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const form = await request.formData();
    const title = str(form.get("title"));
    if (!title) return badRequest("Give the video a title.");

    const video = form.get("video");
    if (!(video instanceof File) || video.size === 0) {
      return badRequest("Choose a video file to upload.");
    }

    let path = "";
    let size = 0;
    try {
      const saved = await saveUpload(video, "video", video.name);
      path = saved.path;
      size = saved.sizeBytes;
    } catch (err) {
      if (!(err instanceof UploadError)) throw err;
      return badRequest(err.message);
    }

    let poster: string | null = null;
    const posterFile = form.get("poster");
    if (posterFile instanceof File && posterFile.size > 0) {
      try {
        const saved = await saveUpload(posterFile, "image", posterFile.name);
        poster = saved.path;
      } catch (err) {
        if (!(err instanceof UploadError)) throw err;
        return badRequest(err.message);
      }
    }

    const data = db();
    const entry = {
      id: uid("vid"),
      title,
      description: str(form.get("description")),
      path,
      poster,
      durationSec: int(form.get("durationSec"), 0),
      views: 0,
      published: bool(form.get("published")),
      createdAt: new Date().toISOString(),
    };
    data.videos.unshift(entry);
    persist("videos");
    void estimateDuration;
    void size;
    return Response.json({ ok: true, id: entry.id });
  } catch (err) {
    return serverError(err, "admin create video");
  }
}
