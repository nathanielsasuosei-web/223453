import Link from "next/link";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-400">{eyebrow}</p>
        )}
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{title}</h2>
        {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost text-xs">
          {action.label}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  violet: "bg-brand/15 text-violet-300 border-brand/30",
  cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  green: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  slate: "bg-panel-2 text-muted border-line-2",
};

export function Badge({
  tone = "slate",
  children,
  className = "",
}: {
  tone?: keyof typeof TONES | string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge border ${TONES[tone] ?? TONES.slate} ${className}`}>{children}</span>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">{label}</p>
        {icon && <span className="text-muted-2">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-panel-2 text-muted-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </div>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {action && (
        <Link href={action.href} className="btn btn-primary mt-1 text-xs">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white ${className}`}
      aria-hidden
    />
  );
}
