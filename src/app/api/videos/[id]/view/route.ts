import { NextResponse } from "next/server";
import { db, persist } from "@/lib/store";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const data = db();
  const video = data.videos.find((v) => v.id === id);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  video.views += 1;
  persist("videos");
  return NextResponse.json({ ok: true, views: video.views });
}
