import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { mimeFor, resolveUploadPath } from "@/lib/upload";

/** Streams uploaded media (audio, artwork, video, receipts) with HTTP range support. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const relPath = segments.join("/");
  const abs = resolveUploadPath(relPath);
  if (!abs) return new NextResponse("Not found", { status: 404 });

  const stat = fs.statSync(abs);
  const type = mimeFor(relPath);
  const baseHeaders: Record<string, string> = {
    "content-type": type,
    "accept-ranges": "bytes",
    "cache-control": "public, max-age=31536000, immutable",
  };

  const range = request.headers.get("range");
  const match = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (Number.isNaN(start) || start > end || start >= stat.size) {
      return new NextResponse(null, {
        status: 416,
        headers: { "content-range": `bytes */${stat.size}` },
      });
    }
    return new NextResponse(Readable.toWeb(fs.createReadStream(abs, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "content-range": `bytes ${start}-${end}/${stat.size}`,
        "content-length": String(end - start + 1),
      },
    });
  }

  return new NextResponse(Readable.toWeb(fs.createReadStream(abs)) as ReadableStream, {
    headers: { ...baseHeaders, "content-length": String(stat.size) },
  });
}
