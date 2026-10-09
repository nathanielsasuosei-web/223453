"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { Spinner } from "./ui";

interface ServiceOption {
  slug: string;
  label: string;
  tagline: string;
  description: string;
  icon: string;
  priceCents: number;
  depositCents: number;
  balanceCents: number;
}

function todayLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function BookingForm({
  services,
  preselect,
  defaultPhone,
  currency,
  currencySymbol,
  depositPercent,
  depositNote,
}: {
  services: ServiceOption[];
  preselect: string | null;
  defaultPhone: string;
  currency: string;
  currencySymbol: string;
  depositPercent: number;
  depositNote: string;
}) {
  const router = useRouter();
  const [service, setService] = useState<string>(preselect ?? services[0]?.slug ?? "");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionTime, setSessionTime] = useState("");
  const [phone, setPhone] = useState(defaultPhone);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = services.find((s) => s.slug === service) ?? services[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selected.slug,
          sessionDate,
          sessionTime,
          phone,
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not create your booking.");
      router.push(`/bookings/${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-6">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">1 · Choose a service</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {services.map((s) => {
            const active = s.slug === selected?.slug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => setService(s.slug)}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-brand/60 bg-brand/10"
                    : "border-line bg-panel/60 hover:border-line-2 hover:bg-panel"
                }`}
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl border border-white/10 ${
                    active ? "bg-brand/25 text-white" : "bg-white/[0.05] text-muted"
                  }`}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </span>
                <span className="text-sm font-bold text-white">{s.label}</span>
                <span className="text-[11px] leading-snug text-muted-2">{s.tagline}</span>
                <span className="mt-auto pt-1 text-sm font-black text-white">
                  {formatMoney(s.priceCents, currency, currencySymbol)}
                </span>
                <span className="text-[10px] text-muted-2">
                  {formatMoney(s.depositCents, currency, currencySymbol)} deposit ({depositPercent}%)
                </span>
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-3 text-xs leading-relaxed text-muted">{selected.description}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sessionDate">
            2 · Session date
          </label>
          <input
            id="sessionDate"
            type="date"
            required
            min={todayLocal()}
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="sessionTime">
            Start time
          </label>
          <input
            id="sessionTime"
            type="time"
            required
            value={sessionTime}
            onChange={(e) => setSessionTime(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="phone">
          3 · Phone number for the studio
        </label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="input"
          placeholder="+233 55 000 0000"
        />
      </div>

      <div>
        <label className="label" htmlFor="note">
          Notes for the studio <span className="text-muted-2">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input resize-y"
          placeholder="Song title, reference tracks, stems link, how many hours you need…"
        />
      </div>

      {selected && (
        <div className="rounded-2xl border border-line bg-panel/60 px-5 py-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-muted">
              Deposit due now ({depositPercent}%)
            </span>
            <span className="font-black text-white">
              {formatMoney(selected.depositCents, currency, currencySymbol)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-muted">Balance due before your session</span>
            <span className="font-semibold text-muted">
              {formatMoney(selected.balanceCents, currency, currencySymbol)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-2">
            <span className="font-semibold text-white">Session total</span>
            <span className="font-black text-white">
              {formatMoney(selected.priceCents, currency, currencySymbol)}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-2">{depositNote}</p>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy || !selected} className="btn btn-primary w-full py-3">
        {busy ? (
          <>
            <Spinner /> Booking…
          </>
        ) : (
          <>
            Book &amp; pay the deposit
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
