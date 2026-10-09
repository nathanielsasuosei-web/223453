"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteContent } from "@/lib/store";

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="input" placeholder={placeholder} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input" placeholder={placeholder} />
      )}
      {hint && <span className="mt-1 block text-[11px] text-muted-2">{hint}</span>}
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-white">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-violet-500" />
      {label}
    </label>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function SiteContentForm({ initial }: { initial: SiteContent }) {
  const router = useRouter();
  const [site, setSite] = useState<SiteContent>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function patch<K extends keyof SiteContent>(key: K, value: SiteContent[K]) {
    setSite((s) => ({ ...s, [key]: value }));
  }
  function patchIn<K extends "announcement" | "hero" | "beatsSection" | "videosSection" | "contact">(
    key: K,
    value: Partial<SiteContent[K]>,
  ) {
    setSite((s) => ({ ...s, [key]: { ...s[key], ...value } }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save website content.");
      setSite(data.site);
      setNotice("Saved — the live site is updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">Website content</h2>
          <p className="mt-1 text-sm text-muted">
            Edit the words, banner and sections visitors see. Beats, videos, prices, payment details and
            contact info have their own pages in this dashboard.
          </p>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary px-5 py-2.5 text-sm">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">{notice}</p>
      )}
      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">{error}</p>
      )}

      <Panel title="Brand" description="Shown in the navigation, footer and browser tab.">
        <Field label="Site / brand name" value={site.brandName} onChange={(v) => patch("brandName", v)} placeholder="BeatForge" />
        <Field
          label="Footer note"
          value={site.footerNote}
          onChange={(v) => patch("footerNote", v)}
          hint="Appears after the © line at the bottom of every page."
        />
      </Panel>

      <Panel title="Announcement banner" description="A slim banner across the top of every page — sales, new drops, holiday hours.">
        <Toggle label="Show the banner" checked={site.announcement.enabled} onChange={(v) => patchIn("announcement", { enabled: v })} />
        <Field label="Message" value={site.announcement.text} onChange={(v) => patchIn("announcement", { text: v })} placeholder="New Amapiano pack out now — 20% off this week" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Link label (optional)" value={site.announcement.linkLabel} onChange={(v) => patchIn("announcement", { linkLabel: v })} placeholder="Shop now" />
          <Field label="Link address (optional)" value={site.announcement.linkHref} onChange={(v) => patchIn("announcement", { linkHref: v })} placeholder="/beats or https://…" />
        </div>
      </Panel>

      <Panel title="Homepage hero" description="The first thing visitors see on the homepage.">
        <Field label="Small heading above the title" value={site.hero.eyebrow} onChange={(v) => patchIn("hero", { eyebrow: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Headline" value={site.hero.headline} onChange={(v) => patchIn("hero", { headline: v })} />
          <Field label="Highlighted words (gradient)" value={site.hero.highlight} onChange={(v) => patchIn("hero", { highlight: v })} />
        </div>
        <Field label="Sub-headline" multiline value={site.hero.subtitle} onChange={(v) => patchIn("hero", { subtitle: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Main button label" value={site.hero.primaryLabel} onChange={(v) => patchIn("hero", { primaryLabel: v })} hint="Leave empty to hide the button." />
          <Field label="Main button link" value={site.hero.primaryHref} onChange={(v) => patchIn("hero", { primaryHref: v })} placeholder="/beats" />
          <Field label="Second button label" value={site.hero.secondaryLabel} onChange={(v) => patchIn("hero", { secondaryLabel: v })} />
          <Field label="Second button link" value={site.hero.secondaryHref} onChange={(v) => patchIn("hero", { secondaryHref: v })} placeholder="/contact" />
        </div>
        <Toggle label="Show the stats (beats, artists, files delivered)" checked={site.hero.showStats} onChange={(v) => patchIn("hero", { showStats: v })} />
      </Panel>

      <Panel title="Homepage — beats section">
        <Toggle label="Show this section" checked={site.beatsSection.show} onChange={(v) => patchIn("beatsSection", { show: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small heading" value={site.beatsSection.eyebrow} onChange={(v) => patchIn("beatsSection", { eyebrow: v })} />
          <Field label="Title" value={site.beatsSection.title} onChange={(v) => patchIn("beatsSection", { title: v })} />
        </div>
        <Field label="Description" multiline value={site.beatsSection.subtitle} onChange={(v) => patchIn("beatsSection", { subtitle: v })} />
      </Panel>

      <Panel title="Homepage — videos section" description="Only appears when at least one video is published.">
        <Toggle label="Show this section" checked={site.videosSection.show} onChange={(v) => patchIn("videosSection", { show: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Small heading" value={site.videosSection.eyebrow} onChange={(v) => patchIn("videosSection", { eyebrow: v })} />
          <Field label="Title" value={site.videosSection.title} onChange={(v) => patchIn("videosSection", { title: v })} />
        </div>
        <Field label="Description" multiline value={site.videosSection.subtitle} onChange={(v) => patchIn("videosSection", { subtitle: v })} />
      </Panel>

      <Panel title="Contact page">
        <Field label="Title" value={site.contact.title} onChange={(v) => patchIn("contact", { title: v })} />
        <Field label="Description" multiline value={site.contact.subtitle} onChange={(v) => patchIn("contact", { subtitle: v })} />
      </Panel>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn btn-primary px-5 py-2.5 text-sm">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
