"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes, formatCount, formatDuration } from "@/lib/format";
import { GENRES } from "@/lib/media";
import { Spinner } from "../ui";

interface BeatFile {
  id: string;
  name: string;
  kind: string;
  sizeBytes: number;
  tier: string;
  tierName: string;
}

interface Beat {
  id: string;
  slug: string;
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
  priceCents: number;
  description: string;
  tags: string[];
  artwork: string;
  durationSec: number;
  plays: number;
  sales: number;
  published: boolean;
  featured: boolean;
  files: BeatFile[];
}

const KEYS = ["—", "A minor", "C minor", "D minor", "E minor", "F minor", "G minor", "A major", "C major", "F major", "G major"];
const MOODS = ["—", "Dark", "Hard", "Melodic", "Chill", "Sad", "Energetic", "Confident", "Romantic", "Groovy"];

export function BeatManager({
  beats: initialBeats,
  licenses,
}: {
  beats: Beat[];
  licenses: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [beats, setBeats] = useState(initialBeats);
  const [editing, setEditing] = useState<Beat | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function refresh() {
    router.refresh();
    setNotice("Saved.");
    window.setTimeout(() => setNotice(""), 2500);
  }

  async function patch(id: string, body: Record<string, unknown>, label = "beat") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/beats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Could not update ${label}.`);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}" and its files? This cannot be undone.`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/beats/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not delete beat.");
      setBeats((prev) => prev.filter((b) => b.id !== id));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function removeFile(beatId: string, fileId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/beats/${beatId}/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not remove file.");
      setBeats((prev) =>
        prev.map((b) => (b.id === beatId ? { ...b, files: b.files.filter((f) => f.id !== fileId) } : b)),
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Beats ({beats.length})</h2>
          <p className="mt-1 text-xs text-muted">
            Upload audio, artwork and license files. Artists preview instantly and receive files by email
            once payment is confirmed.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing("new");
            setError("");
          }}
          className="btn btn-primary text-xs"
        >
          + New beat
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
        <BeatForm
          beat={editing === "new" ? null : editing}
          licenses={licenses}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            setBeats((prev) =>
              saved.id && prev.some((b) => b.id === saved.id)
                ? prev.map((b) => (b.id === saved.id ? { ...b, ...saved } : b))
                : [saved as Beat, ...prev],
            );
            setEditing(null);
            refresh();
          }}
          onRemoveFile={removeFile}
        />
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                <th className="px-5 py-3 font-semibold">Beat</th>
                <th className="px-5 py-3 font-semibold">Details</th>
                <th className="px-5 py-3 font-semibold">Price</th>
                <th className="px-5 py-3 font-semibold">Stats</th>
                <th className="px-5 py-3 font-semibold">Visibility</th>
                <th className="px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {beats.map((beat) => (
                <tr key={beat.id} className="transition-colors hover:bg-panel/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-line-2 bg-panel-2">
                        {beat.artwork ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={beat.artwork} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{beat.title}</p>
                        <p className="truncate text-xs text-muted-2">/beats/{beat.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">
                    <p>
                      {beat.genre} · {beat.bpm} BPM · {beat.musicalKey}
                    </p>
                    <p className="text-muted-2">
                      {beat.files.length} file{beat.files.length === 1 ? "" : "s"} ·{" "}
                      {formatDuration(beat.durationSec)}
                    </p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-white">
                    {(beat.priceCents / 100).toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                    })}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted">
                    <p>{formatCount(beat.plays)} plays</p>
                    <p className="text-muted-2">{beat.sales} sales</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={beat.published}
                          onChange={(e) => patch(beat.id, { published: e.target.checked }, "beat")}
                          className="h-3.5 w-3.5 accent-violet-500"
                        />
                        Published
                      </label>
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input
                          type="checkbox"
                          checked={beat.featured}
                          onChange={(e) => patch(beat.id, { featured: e.target.checked }, "beat")}
                          className="h-3.5 w-3.5 accent-violet-500"
                        />
                        Featured
                      </label>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(beat)} className="btn btn-ghost !px-3 !py-1.5 text-xs">
                        Edit
                      </button>
                      <button
                        onClick={() => remove(beat.id, beat.title)}
                        className="btn btn-danger !px-3 !py-1.5 text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {beats.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No beats yet — upload your first one with “New beat”.
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- the form */

function BeatForm({
  beat,
  licenses,
  busy,
  onCancel,
  onSaved,
  onRemoveFile,
}: {
  beat: Beat | null;
  licenses: { id: string; name: string; slug: string }[];
  busy: boolean;
  onCancel: () => void;
  onSaved: (beat: Partial<Beat> & { id?: string }) => void;
  onRemoveFile: (beatId: string, fileId: string) => void;
}) {
  const [form, setForm] = useState({
    title: beat?.title ?? "",
    genre: beat?.genre ?? "Afrobeats",
    bpm: beat?.bpm ? String(beat.bpm) : "",
    musicalKey: beat?.musicalKey ?? "A minor",
    mood: beat?.mood ?? "Hard",
    price: beat ? (beat.priceCents / 100).toFixed(2) : "29.99",
    description: beat?.description ?? "",
    tags: beat?.tags.join(", ") ?? "",
    published: beat?.published ?? true,
    featured: beat?.featured ?? false,
  });
  const [artwork, setArtwork] = useState<File | null>(null);
  const [files, setFiles] = useState<FileList | null>(null);
  const [tier, setTier] = useState("*");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.set("title", form.title);
      body.set("genre", form.genre);
      body.set("bpm", form.bpm);
      body.set("key", form.musicalKey);
      body.set("mood", form.mood);
      body.set("price", form.price);
      body.set("description", form.description);
      body.set("tags", form.tags);
      body.set("published", String(form.published));
      body.set("featured", String(form.featured));
      body.set("fileTiers", JSON.stringify([]));
      if (artwork) body.set("artwork", artwork);
      if (files) for (const file of Array.from(files)) body.append("files", file);

      const res = await fetch("/api/admin/beats", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save the beat.");
      onSaved({ id: data.id, slug: data.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!beat) return;
    setSaving(true);
    setError("");
    try {
      const body = new FormData();
      body.set("title", form.title);
      body.set("genre", form.genre);
      body.set("bpm", form.bpm);
      body.set("key", form.musicalKey);
      body.set("mood", form.mood);
      body.set("price", form.price);
      body.set("description", form.description);
      body.set("tags", form.tags);
      body.set("published", String(form.published));
      body.set("featured", String(form.featured));
      if (artwork) body.set("artwork", artwork);

      const res = await fetch(`/api/admin/beats/${beat.id}`, { method: "PATCH", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save changes.");

      // append extra files if any were chosen
      if (files && files.length > 0) {
        const fileBody = new FormData();
        fileBody.set("tier", tier);
        for (const file of Array.from(files)) fileBody.append("files", file);
        const fileRes = await fetch(`/api/admin/beats/${beat.id}/files`, { method: "POST", body: fileBody });
        if (!fileRes.ok) {
          const fileData = await fileRes.json().catch(() => ({}));
          throw new Error(fileData.error ?? "Metadata saved but the files failed to upload.");
        }
      }

      onSaved({ id: beat.id, ...data.beat });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={beat ? saveEdits : submit} className="card space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">{beat ? `Edit — ${beat.title}` : "New beat"}</h3>
        <button type="button" onClick={onCancel} className="btn btn-ghost !px-3 !py-1.5 text-xs">
          Close
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="label" htmlFor="f-title">
            Title
          </label>
          <input
            id="f-title"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="input"
            placeholder="Midnight in Accra"
          />
        </div>
        <div>
          <label className="label" htmlFor="f-genre">
            Genre
          </label>
          <input
            id="f-genre"
            list="genre-options"
            value={form.genre}
            onChange={(e) => update("genre", e.target.value)}
            className="input"
          />
          <datalist id="genre-options">
            {GENRES.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="label" htmlFor="f-bpm">
            BPM
          </label>
          <input
            id="f-bpm"
            type="number"
            min={40}
            max={220}
            value={form.bpm}
            onChange={(e) => update("bpm", e.target.value)}
            className="input"
            placeholder="104"
          />
        </div>
        <div>
          <label className="label" htmlFor="f-key">
            Key
          </label>
          <select
            id="f-key"
            value={form.musicalKey}
            onChange={(e) => update("musicalKey", e.target.value)}
            className="input"
          >
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-mood">
            Mood
          </label>
          <select id="f-mood" value={form.mood} onChange={(e) => update("mood", e.target.value)} className="input">
            {MOODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-price">
            Lease price (from)
          </label>
          <input
            id="f-price"
            type="number"
            min={0}
            step="0.01"
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="f-desc">
          Description
        </label>
        <textarea
          id="f-desc"
          rows={3}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          className="input resize-y"
          placeholder="What the beat sounds like, who it fits, how it was made…"
        />
      </div>

      <div>
        <label className="label" htmlFor="f-tags">
          Tags (comma separated)
        </label>
        <input
          id="f-tags"
          value={form.tags}
          onChange={(e) => update("tags", e.target.value)}
          className="input"
          placeholder="type beat, dark, melodic, amapiano"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="f-artwork">
            Artwork {beat?.artwork ? "(replace)" : ""}
          </label>
          <input
            id="f-artwork"
            type="file"
            accept="image/*"
            onChange={(e) => setArtwork(e.target.files?.[0] ?? null)}
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        <div>
          <label className="label" htmlFor="f-files">
            Audio files {beat ? "(add more)" : ""}
          </label>
          <input
            id="f-files"
            type="file"
            accept="audio/*,.zip"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="input file:mr-3 file:rounded-md file:border-0 file:bg-panel-2 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
          />
        </div>
        {beat && (
          <div>
            <label className="label" htmlFor="f-tier">
              New files unlock with
            </label>
            <select id="f-tier" value={tier} onChange={(e) => setTier(e.target.value)} className="input">
              <option value="*">All licenses</option>
              {licenses.map((l) => (
                <option key={l.slug} value={l.slug}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => update("published", e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Published in the store
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => update("featured", e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Feature on the homepage
        </label>
      </div>

      {beat && beat.files.length > 0 && (
        <div className="rounded-xl border border-line bg-ink-2 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-2">Attached files</p>
          <ul className="mt-3 space-y-2">
            {beat.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="rounded-md bg-panel-2 px-1.5 py-0.5 text-[10px] font-bold text-violet-300">
                    {file.kind}
                  </span>
                  <span className="truncate text-muted">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-2">{formatBytes(file.sizeBytes)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="chip !text-[10px]">{file.tierName}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveFile(beat.id, file.id)}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || busy} className="btn btn-primary">
          {saving ? (
            <>
              <Spinner /> Saving…
            </>
          ) : beat ? (
            "Save changes"
          ) : (
            "Upload beat"
          )}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
      </div>
      <p className="text-[11px] text-muted-2">
        Audio up to 120 MB per file (MP3, WAV, OGG, FLAC, ZIP stems). Artwork up to 10 MB.
      </p>
    </form>
  );
}
