import Link from "next/link";
import type { SiteContent } from "@/lib/store";

/** Site-wide banner the producer can switch on from /admin/site. */
export function AnnouncementBar({ content }: { content: SiteContent["announcement"] }) {
  if (!content.enabled || !content.text) return null;
  const external = /^https?:\/\//i.test(content.linkHref);
  return (
    <div className="relative z-50 border-b border-brand/30 bg-gradient-to-r from-brand/25 via-brand-2/15 to-brand/25 px-4 py-2 text-center text-xs font-semibold text-white">
      <span>{content.text}</span>
      {content.linkLabel && content.linkHref && (
        <>
          {" "}
          {external ? (
            <a href={content.linkHref} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-violet-200">
              {content.linkLabel} →
            </a>
          ) : (
            <Link href={content.linkHref} className="underline underline-offset-2 hover:text-violet-200">
              {content.linkLabel} →
            </Link>
          )}
        </>
      )}
    </div>
  );
}
