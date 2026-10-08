"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "../ui";

interface License {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  description: string;
  includes: string[];
  distribution: string;
  streams: string;
  videos: string;
  radio: boolean;
  exclusive: boolean;
  active: boolean;
  sort: number;
}

const EMPTY: Omit<License, "id" | "slug"> = {
  name: "",
  priceCents: 4999,
  description: "",
  includes: [],
  distribution: "Unlimited (non-profit)",
  streams: "100,000 streams",
  videos: "1 music video",
  radio: false,
  exclusive: false,
  active: true,
  sort: 1,
};

export function LicenseManager({ licenses: initialLicenses }: { licenses: License[] }) {
  const router = useRouter();
  const [licenses, setLicenses] = useState(initialLicenses);
  const [editing, setEditing] = useState<(Omit<License, "id" | "slug"> & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    router.refresh();
    setNotice("Saved.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editing,
          includes: editing.includes,
          priceCents: editing.priceCents,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the license.");
      setLicenses((prev) => {
        const exists = prev.some((l) => l.id === data.license.id);
        return exists ? prev.map((l) => (l.id === data.license.id ? data.license : l)) : [...prev, data.license];
      });
      setEditing(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete the "${name}" license?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete license.");
      setLicenses((prev) => prev.filter((l) => l.id !== id));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Licenses ({licenses.length})</h2>
          <p className="mt-1 text-xs text-muted">
            The tiers artists choose at checkout. Prices are shown on every beat page and in the licensing
            section.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing({ ...EMPTY, sort: licenses.length + 1 });
            setError("");
          }}
          className="btn btn-primary text-xs"
        >
          + New license
        </button>
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

      {editing && (
        <form onSubmit={save} className="card space-y-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">
              {editing.id ? `Edit — ${editing.name}` : "New license"}
            </h3>
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost !px-3 !py-1.5 text-xs">
              Close
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="l-name">
                Name
              </label>
              <input
                id="l-name"
                required
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="input"
                placeholder="Premium WAV Lease"
              />
            </div>
            <div>
              <label className="label" htmlFor="l-price">
                Price
              </label>
              <input
                id="l-price"
                type="number"
                min={0}
                step="0.01"
                value={(editing.priceCents / 100).toFixed(2)}
                onChange={(e) =>
                  setEditing({ ...editing, priceCents: Math.round(Number(e.target.value) * 100) || 0 })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="l-sort">
                Display order
              </label>
              <input
                id="l-sort"
                type="number"
                min={1}
                value={editing.sort}
                onChange={(e) => setEditing({ ...editing, sort: Number(e.target.value) || 1 })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label" htmlFor="l-desc">
                Short description
              </label>
              <input
                id="l-desc"
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="input"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label" htmlFor="l-includes">
                What&apos;s included (one per line)
              </label>
              <textarea
                id="l-includes"
                rows={4}
                value={editing.includes.join("\n")}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    includes: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                  })
                }
                className="input resize-y"
              />
            </div>
            <div>
              <label className="label" htmlFor="l-dist">
                Distribution
              </label>
              <input
                id="l-dist"
                value={editing.distribution}
                onChange={(e) => setEditing({ ...editing, distribution: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="l-streams">
                Streams
              </label>
              <input
                id="l-streams"
                value={editing.streams}
                onChange={(e) => setEditing({ ...editing, streams: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="l-videos">
                Music videos
              </label>
              <input
                id="l-videos"
                value={editing.videos}
                onChange={(e) => setEditing({ ...editing, videos: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={editing.radio}
                onChange={(e) => setEditing({ ...editing, radio: e.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              Radio rights
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={editing.exclusive}
                onChange={(e) => setEditing({ ...editing, exclusive: e.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              Exclusive rights (removes the beat from the store on sale)
            </label>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              Active
            </label>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                "Save license"
              )}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {licenses.map((license) => (
          <div key={license.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">{license.name}</h3>
                <p className="text-xs text-muted-2">/{license.slug}</p>
              </div>
              <span
                className={`badge ${
                  license.active ? "bg-emerald-500/15 text-emerald-300" : "bg-panel-2 text-muted"
                }`}
              >
                {license.active ? "active" : "hidden"}
              </span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              {(license.priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
            </p>
            <p className="mt-2 text-sm text-muted">{license.description}</p>
            <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-2">
              {license.includes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
              <li>• Distribution: {license.distribution}</li>
              <li>• Streams: {license.streams}</li>
              <li>• Videos: {license.videos}</li>
              <li>• Radio: {license.radio ? "yes" : "no"}</li>
            </ul>
            <div className="mt-4 flex gap-2 border-t border-line pt-4">
              <button
                onClick={() => {
                  setEditing({ ...license });
                  setError("");
                }}
                className="btn btn-ghost !px-3 !py-1.5 text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => remove(license.id, license.name)}
                className="btn btn-danger !px-3 !py-1.5 text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
