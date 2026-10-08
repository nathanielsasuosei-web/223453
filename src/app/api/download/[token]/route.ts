import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { beatById, db, downloadByToken, licenseById, persist } from "@/lib/store";
import { beatFilesForLicense } from "@/lib/payments";
import { mimeFor, resolveUploadPath, safeFileName } from "@/lib/upload";

/**
 * Private, tokenised download for purchased beats.
 * The token comes from the delivery email — it never expires and is not guessable.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const download = downloadByToken(token);
  if (!download) {
    return NextResponse.redirect(new URL("/download-expired", request.url));
  }

  const beat = beatById(download.beatId);
  if (!beat) return NextResponse.json({ error: "Beat not found" }, { status: 404 });
  const license = licenseById(db().orders.find((o) => o.id === download.orderId)?.licenseId ?? "");
  const allowed = license ? beatFilesForLicense(beat, license) : beat.files;

  const fileId = new URL(request.url).searchParams.get("file");
  const file = fileId ? allowed.find((f) => f.id === fileId) : allowed[0];
  if (!file) {
    return NextResponse.redirect(new URL(`/download/${token}`, request.url));
  }

  const abs = resolveUploadPath(file.path);
  if (!abs) return NextResponse.json({ error: "File missing on the server" }, { status: 410 });

  download.count += 1;
  download.lastAt = new Date().toISOString();
  persist("downloads");

  const stream = Readable.toWeb(fs.createReadStream(abs)) as ReadableStream;
  const name = safeFileName(`${beat.slug}-${file.name}`);
  return new NextResponse(stream, {
    headers: {
      "content-type": mimeFor(file.path),
      "content-length": String(fs.statSync(abs).size),
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
