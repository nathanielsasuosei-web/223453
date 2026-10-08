import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Download link not recognised",
  robots: { index: false },
};

export default function DownloadExpiredPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/15 text-rose-300">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5h.01" />
        </svg>
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-white">We don&apos;t recognise that download link</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        The link may have been mistyped. Open the most recent &ldquo;Beat delivered&rdquo; email and use the
        button inside it — or grab the link from your account.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/account?tab=orders" className="btn btn-primary">
          My orders &amp; downloads
        </Link>
        <Link href="/contact" className="btn btn-ghost">
          Contact the studio
        </Link>
      </div>
    </div>
  );
}
