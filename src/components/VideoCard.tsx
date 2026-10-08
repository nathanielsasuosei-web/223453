"use client";

import { useEffect, useState } from "react";
import { formatCount, formatDuration } from "@/lib/format";
import { publicUrl } from "@/lib/media";

export function VideoCard({
  video,
}: {
  video: {
    id: string;
    title: string;
    description: string;
    path: string;
    poster: string | null;
    durationSec: number;
    views: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const src = publicUrl(video.path);
  const poster = publicUrl(video.poster);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function openVideo() {
    setOpen(true);
    void fetch(`/api/videos/${video.id}/view`, { method: "POST" }).catch(() => {});
  }

  return (
    <>
      <article className="group card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-line-2 hover:shadow-2xl hover:shadow-brand-2/10">
        <button
          onClick={openVideo}
          className="relative block aspect-video w-full overflow-hidden"
          aria-label={`Play ${video.title}`}
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              alt={video.title}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand/30 via-panel to-brand-2/25" />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand group-hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </span>
          <span className="absolute bottom-2 right-2 rounded-md bg-ink/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white backdrop-blur">
            {formatDuration(video.durationSec)}
          </span>
        </button>
        <div className="border-t border-line p-4">
          <h3 className="truncate text-sm font-bold text-white transition-colors group-hover:text-violet-200">
            {video.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{video.description}</p>
          <p className="mt-2 text-[11px] text-muted-2">{formatCount(video.views)} views</p>
        </div>
      </article>

      {open && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-2xl border border-line-2 bg-panel shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <h3 className="truncate text-sm font-bold text-white">{video.title}</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close video"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-panel-2 hover:text-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <video
              src={src}
              poster={poster || undefined}
              controls
              autoPlay
              playsInline
              className="aspect-video w-full bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
}
