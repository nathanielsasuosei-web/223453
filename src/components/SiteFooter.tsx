import Link from "next/link";
import type { Settings } from "@/lib/store";

const SOCIAL_ICONS: Record<string, string> = {
  instagram: "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm5.5-.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z",
  youtube: "M23 12s0-3.8-.5-5.6a3 3 0 0 0-2.1-2.1C18.6 3.8 12 3.8 12 3.8s-6.6 0-8.4.5A3 3 0 0 0 1.5 6.4C1 8.2 1 12 1 12s0 3.8.5 5.6a3 3 0 0 0 2.1 2.1c1.8.5 8.4.5 8.4.5s6.6 0 8.4-.5a3 3 0 0 0 2.1-2.1c.5-1.8.5-5.6.5-5.6zM9.8 15.5v-7l6 3.5-6 3.5z",
  tiktok: "M16.6 5.82a5.3 5.3 0 0 1-1.2-3.32h-3.1v11.6a2.6 2.6 0 1 1-1.85-2.5V8.4a5.7 5.7 0 1 0 4.95 5.65V8.9a8.2 8.2 0 0 0 4.4 1.3V7.1a4.9 4.9 0 0 1-3.2-1.28z",
  spotify: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 0 1-.3-1.5c4.5-1 8.4-.6 11.5 1.4.35.2.45.7.2 1.05zm1.2-2.9a.94.94 0 0 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.55-1.8c4.3-1.3 9.7-.7 13.4 1.6.45.3.6.9.35 1.3zm.1-3a1.12 1.12 0 0 1-1.55.37C12.6 8.8 6.9 8.6 3.4 9.7a1.13 1.13 0 1 1-.65-2.2c4.1-1.2 10.4-1 14.3 1.4.53.32.7 1 .27 1.6z",
  x: "M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.4 22H3.2l7.3-8.3L2.8 2h6.4l4.4 5.9L18.9 2zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20z",
};

export function SiteFooter({ settings }: { settings: Settings }) {
  const socials = Object.entries(settings.socials).filter(([, url]) => url);

  return (
    <footer className="relative mt-24 border-t border-line bg-ink-2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[13px] font-black text-ink">
              BF
            </span>
            <span className="text-lg font-extrabold tracking-tight text-white">{settings.site.brandName}</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            {settings.producerBio}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {settings.momoAccounts.slice(0, 3).map((a) => (
              <span key={a.number} className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {a.provider}
              </span>
            ))}
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              {settings.bankAccount.bankName}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-2">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { href: "/beats", label: "Beat store" },
              { href: "/videos", label: "Videos" },
              { href: "/contact", label: "Contact the studio" },
              { href: "/signup", label: "Create artist account" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-muted transition-colors hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-2">The studio</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted">
            <li>{settings.producerName} — {settings.location}</li>
            <li>
              <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-white">
                {settings.contactEmail}
              </a>
            </li>
            <li>
              <a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`} className="transition-colors hover:text-white">
                {settings.contactPhone}
              </a>
            </li>
          </ul>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={name}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-line-2 bg-panel-2/60 text-muted transition-colors hover:border-brand/60 hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <path d={SOCIAL_ICONS[name] ?? SOCIAL_ICONS.x} />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-muted-2 sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.site.brandName}.
            {settings.site.footerNote ? ` ${settings.site.footerNote}` : ""}
          </p>
          <p>Payments: mobile money &amp; bank transfer · Files delivered by email</p>
        </div>
      </div>
    </footer>
  );
}
