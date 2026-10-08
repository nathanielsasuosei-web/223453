"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AudioBars } from "./AudioBars";
import { usePlayer } from "./PlayerProvider";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/beats", label: "Beats" },
  { href: "/videos", label: "Videos" },
  { href: "/#licenses", label: "Licenses" },
  { href: "/contact", label: "Contact" },
];

export function Navbar({
  producerName,
  user,
}: {
  producerName: string;
  user: { name: string; email: string; role: "ADMIN" | "ARTIST" } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const player = usePlayer();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.split("#")[0]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-ink/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[13px] font-black text-ink shadow-lg shadow-brand/30">
            BF
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-[15px] font-extrabold tracking-tight text-white">BeatForge</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2">
              {producerName}
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-panel-2 text-white"
                  : "text-muted hover:bg-panel/70 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {player.current && (
            <Link
              href={`/beats/${player.current.slug}`}
              className="hidden items-center gap-2 rounded-full border border-line-2 bg-panel/80 py-1.5 pl-2 pr-3 text-xs text-muted transition-colors hover:text-white sm:flex"
              title={`Now playing: ${player.current.title}`}
            >
              <AudioBars playing={player.isPlaying} className="h-3.5" />
              <span className="max-w-[110px] truncate font-semibold text-white">
                {player.current.title}
              </span>
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-line-2 bg-panel-2/80 px-2.5 py-1.5 text-sm font-semibold text-white transition-colors hover:border-brand/60"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-[11px] font-bold text-ink">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[100px] truncate sm:block">{user.name.split(" ")[0]}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {menu && (
                <div className="absolute right-0 top-11 w-56 overflow-hidden rounded-2xl border border-line bg-panel/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                    <p className="truncate text-xs text-muted-2">{user.email}</p>
                    {user.role === "ADMIN" && (
                      <span className="badge mt-1.5 bg-brand/20 text-violet-300">Producer admin</span>
                    )}
                  </div>
                  <div className="my-1 h-px bg-line" />
                  <MenuItem href="/account">My account</MenuItem>
                  <MenuItem href="/account?tab=orders">My orders &amp; downloads</MenuItem>
                  <MenuItem href="/account?tab=messages">Messages</MenuItem>
                  {user.role === "ADMIN" && (
                    <>
                      <div className="my-1 h-px bg-line" />
                      <MenuItem href="/admin">Admin dashboard</MenuItem>
                      <MenuItem href="/admin/beats">Manage beats</MenuItem>
                      <MenuItem href="/admin/videos">Manage videos</MenuItem>
                      <MenuItem href="/admin/orders">Orders &amp; payments</MenuItem>
                    </>
                  )}
                  <div className="my-1 h-px bg-line" />
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
              <Link href="/login" className="btn btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary">
                Create account
              </Link>
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-xl border border-line-2 bg-panel-2/80 text-white md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-line bg-ink/95 px-4 py-3 backdrop-blur-xl md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive(link.href) ? "bg-panel-2 text-white" : "text-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {!user && (
            <Link href="/login" className="mt-2 block rounded-lg bg-panel-2 px-3 py-2.5 text-sm font-medium text-white">
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
      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-panel-2 hover:text-white"
    >
      {children}
    </Link>
  );
}
