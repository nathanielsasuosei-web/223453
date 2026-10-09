"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { AudioBars } from "./AudioBars";
import { usePlayer } from "./PlayerProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/beats", label: "Beats" },
  { href: "/studio", label: "Studio" },
  { href: "/videos", label: "Videos" },
  { href: "/contact", label: "Contact" },
];

type User = { name: string; email: string; role: "ADMIN" | "ARTIST" } | null;

/**
 * Dynamic glass navbar used site-wide.
 * - Full-width glass bar at the top of the page; morphs into a floating pill once you scroll.
 * - Sliding highlight that follows the hovered / active link.
 * - Cursor-following light sheen and a scroll-progress line.
 */
export function GlassNavbar({
  user,
  brandName = "BeatForge",
  producerName = "",
}: {
  user: User;
  brandName?: string;
  producerName?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const player = usePlayer();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });

  const barRef = useRef<HTMLElement | null>(null);
  const linksRef = useRef<HTMLDivElement | null>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeIndex = NAV.findIndex((l) => (l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)));

  /* scroll: morph state + progress */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    setDrawer(false);
    setMenu(false);
    setHover(null);
  }, [pathname]);

  /* sliding indicator position, follows hover or active link */
  const target = hover ?? (activeIndex >= 0 ? activeIndex : null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = target !== null ? linkRefs.current[target] : null;
      const wrap = linksRef.current;
      if (!el || !wrap) {
        setIndicator((s) => ({ ...s, visible: false }));
        return;
      }
      const wrapRect = wrap.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setIndicator({ left: r.left - wrapRect.left, width: r.width, visible: true });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [target]);

  /* cursor-following sheen */
  function onMouseMove(e: MouseEvent<HTMLElement>) {
    const el = barRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <header
      ref={barRef}
      onMouseMove={onMouseMove}
      className={`group/nav sticky top-0 z-50 transition-[padding] duration-500 ease-out ${
        scrolled ? "px-3 pt-3 sm:px-6" : "px-0 pt-0"
      }`}
    >
      <div
        className={`glass-nav relative mx-auto flex h-16 items-center justify-between gap-4 border transition-[max-width,border-radius,background-color,box-shadow,border-color] duration-500 ease-out ${
          scrolled
            ? "max-w-6xl rounded-2xl border-white/12 bg-black/55 px-4 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150 sm:px-5"
            : "max-w-full rounded-none border-x-0 border-t-0 border-white/[0.06] bg-black/35 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6"
        }`}
      >
        {/* cursor sheen */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/nav:opacity-100"
          style={{
            background:
              "radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(167,139,250,0.14), rgba(34,211,238,0.06) 40%, transparent 70%)",
          }}
        />
        {/* top specular edge */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        <div className="relative flex min-w-0 items-center gap-3">
          <button
            onClick={() => setDrawer((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white transition-colors hover:bg-white/[0.08] md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {drawer ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>

          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[13px] font-black text-ink shadow-lg shadow-brand/30 transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-105">
              BF
              <span className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
            </span>
            <span className="hidden min-w-0 flex-col leading-none sm:flex">
              <span className="truncate text-[15px] font-extrabold tracking-tight text-white">{brandName}</span>
              {producerName && (
                <span className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2">
                  {producerName}
                </span>
              )}
            </span>
          </Link>

          {player.current && (
            <Link
              href={`/beats/${player.current.slug}`}
              title={`Now playing: ${player.current.title}`}
              className="hidden min-w-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-2.5 pr-3.5 transition-colors hover:bg-white/[0.1] lg:flex"
            >
              <AudioBars playing={player.isPlaying} className="h-3.5" />
              <span className="max-w-[160px] truncate text-xs font-semibold text-white">{player.current.title}</span>
            </Link>
          )}
        </div>

        {/* desktop links with sliding highlight */}
        <nav className="relative hidden md:block">
          <div ref={linksRef} className="relative flex items-center gap-1 rounded-full border border-white/[0.07] bg-white/[0.03] p-1">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 rounded-full bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_20px_-4px_rgba(167,139,250,0.45)] transition-[left,width,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                left: indicator.left,
                width: indicator.width,
                opacity: indicator.visible ? 1 : 0,
              }}
            />
            {NAV.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-300 ${
                  i === activeIndex ? "text-white" : "text-muted hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="relative flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-white/[0.1]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-[11px] font-bold text-ink">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-white sm:block">{user.name.split(" ")[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {menu && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/85 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-2xl">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-muted-2">{user.email}</p>
                    {user.role === "ADMIN" && (
                      <span className="badge mt-1.5 bg-brand/20 text-violet-300">Producer admin</span>
                    )}
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <MenuItem href="/account">My account</MenuItem>
                  <MenuItem href="/account?tab=orders">Orders &amp; downloads</MenuItem>
                  <MenuItem href="/account?tab=bookings">Studio bookings</MenuItem>
                  <MenuItem href="/account?tab=messages">Messages</MenuItem>
                  {user.role === "ADMIN" && (
                    <>
                      <div className="my-1 h-px bg-white/10" />
                      <MenuItem href="/admin">Producer dashboard</MenuItem>
                      <MenuItem href="/admin/beats">Manage beats</MenuItem>
                      <MenuItem href="/admin/videos">Manage videos</MenuItem>
                      <MenuItem href="/admin/orders">Orders &amp; payments</MenuItem>
                      <MenuItem href="/admin/bookings">Studio bookings</MenuItem>
                      <MenuItem href="/admin/studio">Studio &amp; rates</MenuItem>
                    </>
                  )}
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    onClick={logout}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost hidden px-3 py-1.5 text-xs sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary px-3 py-1.5 text-xs">
                Create account
              </Link>
            </>
          )}
        </div>

        {/* scroll progress line */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-brand via-brand-2 to-brand-3 opacity-80"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* mobile drawer */}
      {drawer && (
        <div className="mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-2 shadow-2xl shadow-black/70 backdrop-blur-2xl md:hidden">
          {NAV.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                i === activeIndex ? "bg-white/[0.1] text-white" : "text-muted hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link
              href="/login"
              className="mt-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              Log in
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
    >
      {children}
    </Link>
  );
}
