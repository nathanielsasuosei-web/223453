"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({
  items,
  pendingCount = 0,
  bookingCount = 0,
  messageCount = 0,
}: {
  items: { href: string; label: string; icon: string }[];
  pendingCount?: number;
  bookingCount?: number;
  messageCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const badge =
          item.href === "/admin/orders" && pendingCount > 0
            ? pendingCount
            : item.href === "/admin/bookings" && bookingCount > 0
              ? bookingCount
              : item.href === "/admin/messages" && messageCount > 0
                ? messageCount
                : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
              active
                ? "bg-gradient-to-r from-brand/25 to-brand-2/10 text-white"
                : "text-muted hover:bg-panel hover:text-white"
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
            <span className="whitespace-nowrap">{item.label}</span>
            {badge > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-rose-500/20 px-1.5 text-[10px] font-bold text-rose-300">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
