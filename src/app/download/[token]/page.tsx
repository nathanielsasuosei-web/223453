import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { beatById, db, downloadByToken, licenseById, orderById } from "@/lib/store";
import { beatFilesForLicense } from "@/lib/payments";
import { artworkUrl } from "@/lib/media";
import { formatBytes, formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = {
  title: "Your download",
  robots: { index: false },
};

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const download = downloadByToken(token);
  if (!download) notFound();

  const order = orderById(download.orderId);
  const beat = beatById(download.beatId);
  if (!order || !beat) notFound();
  const license = licenseById(order.licenseId);
  const settings = db().settings;
  const files = license ? beatFilesForLicense(beat, license) : beat.files;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="badge bg-emerald-500/15 text-emerald-300">Payment confirmed</span>
        <span className="text-xs text-muted-2">
          Delivered {formatDateTime(order.deliveredAt ?? order.paidAt)} · order {order.code}
        </span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-line p-6 sm:flex-row sm:items-center">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line-2 bg-panel-2">
            {beat.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artworkUrl(beat)} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
              {license?.name ?? "License"}
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">{beat.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {beat.genre} · {beat.bpm} BPM · {beat.musicalKey} ·{" "}
              {formatMoney(order.amountCents, order.currency, settings.currencySymbol)} paid
            </p>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Your files</h2>
          <ul className="mt-4 space-y-3">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-ink-2 px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-panel-2 text-[10px] font-bold text-violet-300">
                    {file.kind}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-muted-2">{formatBytes(file.sizeBytes)}</p>
                  </div>
                </div>
                <a
                  href={`/api/download/${token}?file=${file.id}`}
                  className="btn btn-primary text-xs"
                  download={file.name}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                    <path d="M4 19h16" />
                  </svg>
                  Download
                </a>
              </li>
            ))}
          </ul>

          {files.length === 0 && (
            <p className="text-sm text-muted">
              No files are attached to this license yet. The studio has been notified — reply to your
              delivery email and they will send them manually.
            </p>
          )}

          <div className="mt-6 rounded-xl border border-line bg-ink-2 p-4 text-xs leading-relaxed text-muted">
            <p className="font-bold text-white">License summary — {license?.name}</p>
            <p className="mt-1">{license?.description}</p>
            <ul className="mt-2 space-y-1">
              {(license?.includes ?? []).map((item) => (
                <li key={item}>• {item}</li>
              ))}
              <li>• Distribution: {license?.distribution}</li>
              <li>• Streams: {license?.streams}</li>
              <li>• Music videos: {license?.videos}</li>
              <li>• Radio: {license?.radio ? "Included" : "Not included"}</li>
            </ul>
            <p className="mt-2 text-muted-2">{settings.deliveryNote}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/beats" className="btn btn-ghost text-xs">
              Browse more beats
            </Link>
            <Link href="/account?tab=orders" className="btn btn-ghost text-xs">
              All my orders
            </Link>
            <a href={`mailto:${settings.contactEmail}?subject=Order ${order.code}`} className="btn btn-ghost text-xs">
              Email the studio
            </a>
          </div>

          <p className="mt-6 text-[11px] text-muted-2">
            This link is private and never expires. Downloaded {download.count} time
            {download.count === 1 ? "" : "s"}.
          </p>
        </div>
      </div>
    </div>
  );
}
