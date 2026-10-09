"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAYS } from "@/lib/studio";
import type { StudioService, StudioSettings } from "@/lib/store";
import { Spinner } from "../ui";

export function StudioSettingsForm({
  studio,
  services,
  allowHalfPayments,
  currency,
}: {
  studio: StudioSettings;
  services: StudioService[];
  allowHalfPayments: boolean;
  currency: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState(studio);
  const [list, setList] = useState(services);
  const [half, setHalf] = useState(allowHalfPayments);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function patchStudio(patch: Partial<StudioSettings>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function patchDay(day: string, patch: Partial<StudioSettings["hours"][string]>) {
    setForm((f) => ({
      ...f,
      hours: { ...f.hours, [day]: { ...f.hours[day], ...patch } },
    }));
  }

  function patchService(index: number, patch: Partial<StudioService>) {
    setList((l) => l.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addService() {
    setList((l) => [
      ...l,
      {
        id: "",
        slug: "",
        name: "New service",
        blurb: "",
        priceCents: 0,
        minHours: 1,
        maxHours: 4,
        active: true,
        sort: l.length + 1,
      },
    ]);
  }

  function removeService(index: number) {
    setList((l) => l.filter((_, i) => i !== index));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studio: form,
          services: list.map((s) => ({ ...s, price: (s.priceCents / 100).toFixed(2) })),
          allowHalfPayments: half,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the studio settings.");
      setNotice("Studio saved — the booking page now uses these hours, prices and deposit.");
      if (Array.isArray(data.services)) setList(data.services);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Studio & bookings</h2>
        <p className="mt-1 text-xs text-muted">
          Opening hours, session prices and the deposit artists pay to lock a slot. The booking page lives at{" "}
          <span className="font-mono text-violet-300">/studio</span>.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      {/* ------------------------------------------------------------ basics */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Booking page</h3>
        <Toggle
          label="Accept online bookings"
          hint="Turn off to close the calendar — visitors see a message pointing them to the contact page."
          checked={form.enabled}
          onChange={(v) => patchStudio({ enabled: v })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Small heading"
            value={form.eyebrow}
            onChange={(v) => patchStudio({ eyebrow: v })}
          />
          <Field label="Title" value={form.title} onChange={(v) => patchStudio({ title: v })} />
        </div>
        <Field
          label="Sub-headline"
          multiline
          value={form.subtitle}
          onChange={(v) => patchStudio({ subtitle: v })}
        />
        <Field
          label="Studio address"
          value={form.address}
          onChange={(v) => patchStudio({ address: v })}
          placeholder="12 Oxford Street, Osu, Accra"
          hint="Shown on booking confirmations. Falls back to your location in Studio settings."
        />
      </section>

      {/* ------------------------------------------------------------ money */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Deposits & payments</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="dep-pct">
              Deposit to lock a slot (%)
            </label>
            <input
              id="dep-pct"
              type="number"
              min={1}
              max={100}
              value={form.depositPercent}
              onChange={(e) => patchStudio({ depositPercent: Number(e.target.value) })}
              className="input"
            />
            <p className="mt-1 text-[11px] text-muted-2">Artists pay this now, the rest at the studio.</p>
          </div>
          <div>
            <label className="label" htmlFor="slot-len">
              Slot length
            </label>
            <select
              id="slot-len"
              value={form.slotMinutes}
              onChange={(e) => patchStudio({ slotMinutes: Number(e.target.value) })}
              className="input"
            >
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>90 minutes</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="lead-time">
              Minimum notice (hours)
            </label>
            <input
              id="lead-time"
              type="number"
              min={0}
              max={720}
              value={form.leadTimeHours}
              onChange={(e) => patchStudio({ leadTimeHours: Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>
        <div className="sm:w-1/3">
          <label className="label" htmlFor="horizon">
            Bookable window (days ahead)
          </label>
          <input
            id="horizon"
            type="number"
            min={1}
            max={365}
            value={form.maxDaysAhead}
            onChange={(e) => patchStudio({ maxDaysAhead: Number(e.target.value) })}
            className="input"
          />
        </div>
        <Toggle
          label="Let artists pay beat licences 50% now / 50% before delivery"
          hint="Adds a “Pay 50% now” option at beat checkout. Files are released when the balance lands."
          checked={half}
          onChange={setHalf}
        />
        <Field
          label="Booking policy"
          multiline
          value={form.policy}
          onChange={(v) => patchStudio({ policy: v })}
          hint="Shown on the booking page and in confirmation emails."
        />
      </section>

      {/* ------------------------------------------------------------ hours */}
      <section className="card space-y-3 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Opening hours</h3>
        {WEEKDAYS.map((day, index) => {
          const key = String(index);
          const entry = form.hours[key] ?? { open: "09:00", close: "21:00", closed: false };
          return (
            <div key={day} className="flex flex-wrap items-center gap-3">
              <span className="w-24 text-xs font-semibold text-white">{day.slice(0, 3)}</span>
              <input
                type="time"
                value={entry.open}
                onChange={(e) => patchDay(key, { open: e.target.value })}
                className="input w-32"
                aria-label={`${day} opening time`}
              />
              <span className="text-muted-2">to</span>
              <input
                type="time"
                value={entry.close}
                onChange={(e) => patchDay(key, { close: e.target.value })}
                className="input w-32"
                aria-label={`${day} closing time`}
              />
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={entry.closed}
                  onChange={(e) => patchDay(key, { closed: e.target.checked })}
                  className="h-4 w-4 accent-violet-500"
                />
                Closed
              </label>
            </div>
          );
        })}
      </section>

      {/* --------------------------------------------------------- services */}
      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Services & pricing</h3>
          <button type="button" onClick={addService} className="btn btn-ghost text-xs">
            Add service
          </button>
        </div>
        {list.length ? (
          <div className="space-y-4">
            {list.map((service, index) => (
              <div key={service.id || index} className="rounded-xl border border-line bg-ink-2 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Name"
                    value={service.name}
                    onChange={(v) => patchService(index, { name: v })}
                  />
                  <div>
                    <label className="label" htmlFor={`svc-price-${index}`}>
                      Price per hour ({currency})
                    </label>
                    <input
                      id={`svc-price-${index}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={(service.priceCents / 100).toFixed(2)}
                      onChange={(e) => patchService(index, { priceCents: Math.round(Number(e.target.value) * 100) })}
                      className="input"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Field
                    label="What's included"
                    multiline
                    value={service.blurb}
                    onChange={(v) => patchService(index, { blurb: v })}
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="label" htmlFor={`svc-min-${index}`}>
                      Min hours
                    </label>
                    <input
                      id={`svc-min-${index}`}
                      type="number"
                      min={1}
                      max={24}
                      value={service.minHours}
                      onChange={(e) =>
                        patchService(index, {
                          minHours: Math.max(1, Number(e.target.value) || 1),
                          maxHours: Math.max(service.maxHours, Number(e.target.value) || 1),
                        })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor={`svc-max-${index}`}>
                      Max hours
                    </label>
                    <input
                      id={`svc-max-${index}`}
                      type="number"
                      min={1}
                      max={24}
                      value={service.maxHours}
                      onChange={(e) => patchService(index, { maxHours: Math.max(1, Number(e.target.value) || 1) })}
                      className="input"
                    />
                  </div>
                  <label className="flex items-end gap-2 pb-2 text-xs text-muted">
                    <input
                      type="checkbox"
                      checked={service.active}
                      onChange={(e) => patchService(index, { active: e.target.checked })}
                      className="h-4 w-4 accent-violet-500"
                    />
                    Bookable
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="mt-3 text-[11px] font-semibold text-rose-300 hover:underline"
                >
                  Remove service
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-2">No services yet — add one so artists can book.</p>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save studio settings"
          )}
        </button>
        <a href="/studio" target="_blank" rel="noreferrer" className="btn btn-ghost text-xs">
          Open booking page
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="label block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="input resize-y"
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
      )}
      {hint && <p className="mt-1 text-[11px] text-muted-2">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-ink-2 p-3.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-violet-500"
      />
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
