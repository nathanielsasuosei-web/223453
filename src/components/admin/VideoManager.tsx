"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCount, formatDuration, timeAgo } from "@/lib/format";
import { Spinner } from "../ui";

interface Video {
  id: string;
  title: string;
  description: string;
  poster: string;
  durationSec: number;
  views: number;
  published: boolean;
  createdAt: string;
}

export function VideoManager({
  videos: initialVideos,
  totalViews,
  totalDuration,
}: {
  videos: Video[];
  totalViews: string;
  totalDuration: string;
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [form, setForm] = useState({
    title: "",
    description: "",
    durationSec: "",
    published: true,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    router.refresh();
    setNotice("Saved.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!videoFile) {
      setError("Choose a video file first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.set("title", form.title);
      body.set("description", form.description);
      body.set("durationSec", form.durationSec);
      body.set("published", String(form.published));
      body.set("video", videoFile);
      if (posterFile) body.set("poster", posterFile);

      const res = await fetch("/api/admin/videos", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not upload the video.");

      setForm({ title: "", description: "", durationSec: "", published: true });
      setVideoFile(null);
      setPosterFile(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/videos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update video.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete video.");
      setVideos((prev) => prev.filter((v) => v.id !== id));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Videos ({videos.length})</h2>
          <p className="mt-1 text-xs text-muted">
            {totalViews} total views · {totalDuration} of footage published.
          </p>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      <form onSubmit={upload} className="card space-y-4 p-5">
        <h3 className="text-base font-bold text-white">Upload a video</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="v-title">
              Title
            </label>
            <input
              id="v-title"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="input"
              placeholder="Studio session — Midnight in Accra"
            />
          </div>
          <div>
            <label className="label" htmlFor="v-duration">
              Duration (seconds)
            </label>
            <input
              id="v-duration"
              type="number"
              min={0}
              value={form.durationSec}
              onChange={(e) => setForm((f) => ({ ...f, durationSec: e.target.value }))}
              className="input"
              placeholder="132"
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="v-desc">
            Description
          </label>
          <textarea
            id="v-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="input resize-y"
            placeholder="What happens in the video…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="v-file">
              Video file (MP4, WebM, MOV)
            </label>
            <input
              id="v-file"
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
              className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
          </div>
          <div>
            <label className="label" htmlFor="v-poster">
              Poster image (optional)
            </label>
            <input
              id="v-poster"
              type="file"
              accept="image/*"
              onChange={(e) => setPosterFile(e.target.files?.[0] ?? null)}
              className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
            className="h-4 w-4 accent-violet-500"
          />
          Publish immediately
        </label>
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? (
            <>
              <Spinner /> Uploading…
            </>
          ) : (
            "Upload video"
          )}
        </button>
        <p className="text-[11px] text-muted-2">Videos up to 400 MB per upload.</p>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                <th className="px-5 py-3 font-semibold">Video</th>
                <th className="px-5 py-3 font-semibold">Length</th>
                <th className="px-5 py-3 font-semibold">Views</th>
                <th className="px-5 py-3 font-semibold">Published</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {videos.map((video) => (
                <tr key={video.id} className="transition-colors hover:bg-panel/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
                        {video.poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={video.poster} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{video.title}</p>
                        <p className="truncate text-xs text-muted-2">{video.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted">{formatDuration(video.durationSec)}</td>
                  <td className="px-5 py-4 text-muted">{formatCount(video.views)}</td>
                  <td className="px-5 py-4">
                    <label className="flex items-center gap-2 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={video.published}
                        onChange={(e) => patch(video.id, { published: e.target.checked })}
                        className="h-3.5 w-3.5 accent-violet-500"
                      />
                      Live
                    </label>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-2">{timeAgo(video.createdAt)}</td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => remove(video.id, video.title)}
                      className="btn btn-danger !px-3 !py-1.5 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {videos.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">No videos yet — upload one above.</p>
        )}
      </div>
    </div>
  );
}
