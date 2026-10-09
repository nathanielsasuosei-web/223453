"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import {
  checkSlot,
  dayFor,
  labelTime,
  prettyDate,
  serviceQuote,
  slotStarts,
  WEEKDAYS,
  type Hold,
} from "@/lib/studio";
import type { StudioService, StudioSettings } from "@/lib/store";
import { Spinner } from "./ui";

export interface StudioBookingService
  extends Pick<StudioService, "id" | "slug" | "name" | "blurb" | "priceCents" | "minHours" | "maxHours"> {}

export function StudioBooking({
  services,
  studio,
  dates,
  holds,
  currency,
  currencySymbol,
  user,
}: {
  services: StudioBookingService[];
  studio: StudioSettings;
  dates: string[];
  holds: Hold[];
  currency: string;
  currencySymbol: string;
  user: { name: string; email: string; phone: string };
}) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(dates[0] ?? "");
  const [hours, setHours] = useState(services[0]?.minHours ?? 1);
  const [start, setStart] = useState("");
  const [notes, setNotes] = useState("");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const service = services.find((s) => s.id === serviceId) ?? services[0];
  const hourOptions = useMemo(() => {
    if (!service) return [] as number[];
    const out: number[] = [];
    for (let h = service.minHours; h <= service.maxHours; h++) out.push(h);
    return out;
  }, [service]);

  const quote = service ? serviceQuote(service, hours, studio.depositPercent) : null;

  const slots = useMemo(() => {
    if (!date) return [];
    const day = dayFor(studio, date);
    return slotStarts(day, studio.slotMinutes).map((time) => {
      const check = checkSlot(studio, holds, date, time, hours);
      return { start: time, label: labelTime(time), available: check.ok, reason: check.reason };
    });
  }, [date, hours, holds, studio]);

  const ready = Boolean(service && date && start && quote && !busy);

  function pickService(id: string) {
    const next = services.find((s) => s.id === id);
    setServiceId(id);
    if (next) {
      setHours((h) => Math.min(next.maxHours, Math.max(next.minHours, h)));
      setStart("");
    }
  }

  function pickHours(value: number) {
    setHours(value);
    setStart("");
  }

  function pickDate(value: string) {
    setDate(value);
    setStart("");
  }

  async function book() {
    if (!service || !quote) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, date, start, hours, notes, phone, name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push("/login?next=/studio");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not create your booking.");
      router.push(`/booking/${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!service || !quote) {
    return (
      <div className="card p-8 text-center text-sm text-muted">
        No studio services are published yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------ 1 · service */}
      <Step n={1} title="Service">
        <div className="grid gap-3 sm:grid-cols-3">
          {services.map((s) => {
            const active = s.id === service.id;
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => pickService(s.id)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? "border-brand bg-brand/10 shadow-lg shadow-brand/10"
                    : "border-line bg-ink-2 hover:border-line-2"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-bold text-white">{s.name}</span>
                  <span className="text-sm font-extrabold text-violet-300">
                    {formatMoney(s.priceCents, currency, currencySymbol)}
                    <span className="text-[11px] font-semibold text-muted-2">/hr</span>
                  </span>
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                  {s.minHours}–{s.maxHours} hrs · {studio.depositPercent}% deposit
                </span>
                <span className="mt-2 block text-xs leading-relaxed text-muted">{s.blurb}</span>
              </button>
            );
          })}
        </div>
      </Step>

      {/* ------------------------------------------------ 2 · date & duration */}
      <Step n={2} title="Date & duration">
        <div className="space-y-4">
          <div>
            <p className="label mb-2">Pick a date</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {dates.slice(0, 30).map((d) => {
                const active = d === date;
                const parsed = new Date(`${d}T00:00:00`);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => pickDate(d)}
                    className={`min-w-[74px] shrink-0 rounded-xl border px-3 py-2.5 text-center transition-all ${
                      active
                        ? "border-brand bg-brand/15 text-white"
                        : "border-line bg-ink-2 text-muted hover:border-line-2"
                    }`}
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wider">
                      {WEEKDAYS[parsed.getDay()].slice(0, 3)}
                    </span>
                    <span className="mt-0.5 block text-base font-extrabold text-white">
                      {parsed.getDate()}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wider text-muted-2">
                      {parsed.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="bk-hours">
              Duration
            </label>
            <select
              id="bk-hours"
              value={hours}
              onChange={(e) => pickHours(Number(e.target.value))}
              className="input"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h} hour{h === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Step>

      {/* --------------------------------------------------- 3 · start time */}
      <Step
        n={3}
        title="Start time"
        hint={
          date
            ? `${WEEKDAYS[new Date(`${date}T00:00:00`).getDay()]} · open ${labelTime(
                dayFor(studio, date).open,
              )} – ${labelTime(dayFor(studio, date).close)}`
            : undefined
        }
      >
        {slots.length ? (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                type="button"
                key={slot.start}
                disabled={!slot.available}
                onClick={() => setStart(slot.start)}
                title={
                  slot.available
                    ? `Book ${slot.label}`
                    : slot.reason === "taken"
                      ? "Already booked"
                      : slot.reason === "past"
                        ? "Too soon to book"
                        : "Unavailable"
                }
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
                  slot.start === start
                    ? "border-brand bg-brand/20 text-white"
                    : slot.available
                      ? "border-line bg-ink-2 text-muted hover:border-line-2 hover:text-white"
                      : "cursor-not-allowed border-line/60 bg-ink-2/40 text-muted-2 line-through"
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-2">The studio is closed on this day — pick another date.</p>
        )}
        <p className="mt-3 text-[11px] text-muted-2">
          Greyed-out times are already booked or too soon to schedule.
        </p>
      </Step>

      {/* -------------------------------------------------------- 4 · notes */}
      <Step n={4} title="Notes for the engineer" hint="optional">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Reference tracks, how many songs, whether you need a beat made from scratch…"
          className="input resize-y"
        />
      </Step>

      {/* ------------------------------------------------------ 5 · details */}
      <Step n={5} title="Your details">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="bk-name">
              Full name
            </label>
            <input
              id="bk-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="label" htmlFor="bk-email">
              Email address
            </label>
            <input
              id="bk-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="bk-phone">
              Phone / WhatsApp
            </label>
            <input
              id="bk-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              placeholder="+233 …"
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-2">
          Your confirmation, receipt and session details are sent to this email.
        </p>
      </Step>

      {/* --------------------------------------------------------- summary */}
      <div className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Summary</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label={`${service.name} (${quote.hours} × ${formatMoney(service.priceCents, currency, currencySymbol)})`}>
            {formatMoney(quote.totalCents, currency, currencySymbol)}
          </Row>
          <Row label={`Deposit to lock slot (${studio.depositPercent}%)`}>
            <span className="text-violet-300">
              {formatMoney(quote.depositCents, currency, currencySymbol)}
            </span>
          </Row>
          <Row label="Balance at the studio">
            {formatMoney(quote.balanceCents, currency, currencySymbol)}
          </Row>
          <Row label="When">
            {date && start
              ? `${prettyDate(date)} · ${labelTime(start)} · ${quote.hours} hr${quote.hours === 1 ? "" : "s"}`
              : "Choose a date and start time"}
          </Row>
        </dl>

        <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">Pay now</p>
            <p className="text-2xl font-black tracking-tight text-white">
              {formatMoney(quote.depositCents, currency, currencySymbol)}
            </p>
          </div>
          <p className="text-right text-[11px] text-muted-2">
            {studio.depositPercent}% deposit
            <br />
            balance before the session
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <button onClick={book} disabled={!ready} className="btn btn-primary mt-4 w-full py-3">
          {busy ? (
            <>
              <Spinner /> Holding your slot…
            </>
          ) : (
            <>
              Pay {formatMoney(quote.depositCents, currency, currencySymbol)} deposit
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </>
          )}
        </button>
        <p className="mt-2.5 text-center text-[11px] text-muted-2">
          Mobile money &amp; bank transfer · the slot is yours the moment the deposit is confirmed
        </p>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex flex-wrap items-baseline gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-brand/20 text-[11px] font-black text-violet-200">
          {n}
        </span>
        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">{title}</h2>
        {hint && <span className="text-[11px] text-muted-2">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="min-w-0 truncate text-muted">{label}</dt>
      <dd className="shrink-0 font-semibold text-white">{children}</dd>
    </div>
  );
}
