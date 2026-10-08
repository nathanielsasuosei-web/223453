import type { Metadata } from "next";
import { db } from "@/lib/store";
import { VideoManager } from "@/components/admin/VideoManager";
import { publicUrl } from "@/lib/upload";
import { formatCount, formatDuration } from "@/lib/format";

export const metadata: Metadata = {
  title: "Videos",
};

export default function AdminVideosPage() {
  const data = db();
  const videos = data.videos.map((video) => ({
    id: video.id,
    title: video.title,
    description: video.description,
    poster: publicUrl(video.poster),
    durationSec: video.durationSec,
    views: video.views,
    published: video.published,
    createdAt: video.createdAt,
  }));

  return <VideoManager videos={videos} totalViews={formatCount(videos.reduce((s, v) => s + v.views, 0))} totalDuration={formatDuration(videos.reduce((s, v) => s + v.durationSec, 0))} />;
}
