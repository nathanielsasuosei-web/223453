"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AudioBars } from "./AudioBars";
import { usePlayer } from "./PlayerProvider";

const NAV = [
  {
    href: "/",
    label: "Home",
    icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  },
  {
    href: "/beats",
    label: "Beats",
    icon: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
  },
  {
    href: "/videos",
    label: "Videos",
    icon: "m22 8-6 4 6 4V8zM14 6H2v12h12V6z",
  },
  {
    href: "/contact",
    label: "Contact",
    icon: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7",
  },
];

export function HomeSidebar({
  producerName,
  brandName = "BeatForge",
  user,
}: {
  producerName: string;
  brandName?: string;
  user: { name: string; email: string; role: "ADMIN" | "ARTIST" } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const player = usePlayer();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/");
  }

  return (
    <aside className="hidden w-[250px] shrink-0 self-start lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-3">
      {/* brand */}
      <Link
        href="/"
        className="group flex items-center gap-3 rounded-2xl border border-line bg-panel/70 p-4 backdrop-blur-xl transition-colors hover:border-brand/50"
      >
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-sm font-black text-ink shadow-lg shadow-brand/30">
          BF
          <span className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
        </span>
        <span className="flex min-w-0 flex-col leading-none">
          <span className="text-[15px] font-extrabold tracking-tight text-white">{brandName}</span>
          <span className="mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-2">
            {producerName}
          </span>
        </span>
      </Link>

      {/* menu */}
      <nav className="flex flex-col gap-1 rounded-2xl border border-line bg-panel/70 p-2 backdrop-blur-xl">
        <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
          Menu
        </p>
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-gradient-to-r from-brand/25 to-brand-2/10 text-white"
                  : "text-muted hover:bg-panel-2 hover:text-white"
              }`}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* now playing */}
      {player.current && (
        <Link
          href={`/beats/${player.current.slug}`}
          className="group flex items-center gap-3 rounded-2xl border border-line-2 bg-gradient-to-br from-brand/15 to-brand-2/10 p-3 backdrop-blur-xl transition-colors hover:border-brand/60"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-panel-2 text-brand-2">
            <AudioBars playing={player.isPlaying} className="h-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-violet-300">
              Now playing
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold text-white">
              {player.current.title}
            </span>
          </span>
        </Link>
      )}

      {/* account */}
      <div className="rounded-2xl border border-line bg-panel/70 p-3 backdrop-blur-xl">
        {user ? (
          <>
            <div className="flex items-center gap-2.5 px-1 py-1">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-3 to-brand text-sm font-bold text-ink">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{user.name}</span>
                <span className="block truncate text-xs text-muted-2">{user.email}</span>
              </span>
            </div>
            {user.role === "ADMIN" && (
              <span className="badge mx-1 mt-2 bg-brand/20 text-violet-300">Producer admin</span>
            )}
            <div className="my-2.5 h-px bg-line" />
            <div className="flex flex-col gap-0.5">
              <SideLink href="/account">My account</SideLink>
              <SideLink href="/account?tab=orders">Orders &amp; downloads</SideLink>
              <SideLink href="/account?tab=messages">Messages</SideLink>
              {user.role === "ADMIN" && <SideLink href="/admin">Producer dashboard</SideLink>}
            </div>
            <div className="my-2.5 h-px bg-line" />
            <button
              onClick={logout}
              className="w-full rounded-lg px-3 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
            >
              Log out
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-2 p-1">
            <p className="px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-2">
              Account
            </p>
            <Link href="/login" className="btn btn-ghost text-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary text-sm">
              Create account
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

function SideLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-panel-2 hover:text-white"
    >
      {children}
    </Link>
  );
}
