"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AudioBars } from "./AudioBars";
import { usePlayer } from "./PlayerProvider";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/beats", label: "Beats" },
  { href: "/videos", label: "Videos" },
  { href: "/contact", label: "Contact" },
];

export function GlassNavbar({
  user,
}: {
  user: { name: string; email: string; role: "ADMIN" | "ARTIST" } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const player = usePlayer();
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setDrawer(false);
    setMenu(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <div
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-black/60 shadow-lg shadow-black/50 backdrop-blur-2xl"
          : "border-b border-white/[0.06] bg-black/30 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => setDrawer((v) => !v)}
            aria-label="Menu"
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-white lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {drawer ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
          {player.current ? (
            <Link
              href={`/beats/${player.current.slug}`}
              title={`Now playing: ${player.current.title}`}
              className="flex min-w-0 items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-2.5 pr-3.5 transition-colors hover:bg-white/[0.08]"
            >
              <AudioBars playing={player.isPlaying} className="h-3.5" />
              <span className="max-w-[140px] truncate text-xs font-semibold text-white sm:max-w-[200px]">
                {player.current.title}
              </span>
            </Link>
          ) : (
            <span className="text-sm font-semibold text-muted">Dashboard</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-2 transition-colors hover:bg-white/[0.08]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-[11px] font-bold text-ink">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="hidden text-sm font-semibold text-white sm:block">
                  {user.name.split(" ")[0]}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-muted"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {menu && (
                <div className="absolute right-0 top-11 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-2xl">
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
                  <MenuItem href="/account?tab=messages">Messages</MenuItem>
                  {user.role === "ADMIN" && <MenuItem href="/admin">Producer dashboard</MenuItem>}
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
      </div>

      {drawer && (
        <div className="border-t border-white/10 bg-black/80 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6">
            {NAV.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setDrawer(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                onClick={() => setDrawer(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </div>
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
