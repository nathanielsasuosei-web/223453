import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/store";
import { VideoCard } from "@/components/VideoCard";
import { EmptyState, SectionHeading } from "@/components/ui";
import { formatCount } from "@/lib/format";

export const metadata: Metadata = {
  title: "Videos",
  description: "Studio sessions, beat breakdowns and visuals from the BeatForge studio.",
};

export default function VideosPage() {
  const data = db();
  const videos = data.videos.filter((v) => v.published);
  const totalViews = videos.reduce((sum, v) => sum + v.views, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="Visuals"
        title="Videos"
        subtitle="Behind the boards: studio sessions, beat breakdowns and visuals. Every track you hear is available to lease."
        action={{ href: "/beats", label: "Browse beats" }}
      />

      <div className="mb-8 flex flex-wrap gap-2">
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />
          {videos.length} video{videos.length === 1 ? "" : "s"}
        </span>
        <span className="chip">{formatCount(totalViews)} total views</span>
      </div>

      {videos.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No videos yet"
          message="The studio hasn't published any videos. In the meantime, preview the full beat catalog."
          action={{ href: "/beats", label: "Browse beats" }}
        />
      )}

      <div className="mt-14 card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Want a custom beat or a video for your record?</h2>
          <p className="mt-1 text-sm text-muted">
            Send the studio a message — custom production and visual packages are available.
          </p>
        </div>
        <Link href="/contact" className="btn btn-primary">
          Message the studio
        </Link>
      </div>
    </div>
  );
}
