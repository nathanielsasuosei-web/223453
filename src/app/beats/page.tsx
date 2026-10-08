import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/store";
import { BeatCard } from "@/components/BeatCard";
import { EmptyState, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Beat store",
  description: "Browse and preview every beat. Lease or buy exclusive rights — instant email delivery.",
};

const SORTS: Record<string, (a: { createdAt: string; priceCents: number; plays: number; sales: number; title: string }, b: { createdAt: string; priceCents: number; plays: number; sales: number; title: string }) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  popular: (a, b) => b.plays - a.plays,
  "price-low": (a, b) => a.priceCents - b.priceCents,
  "price-high": (a, b) => b.priceCents - a.priceCents,
  best: (a, b) => b.sales - a.sales,
  az: (a, b) => a.title.localeCompare(b.title),
};

export default async function BeatsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; genre?: string; sort?: string; key?: string }>;
}) {
  const params = await searchParams;
  const data = db();
  const settings = data.settings;
  const q = (params.q ?? "").trim().toLowerCase();
  const genre = params.genre ?? "";
  const sort = params.sort ?? "newest";

  let beats = data.beats.filter((b) => b.published);
  if (genre) beats = beats.filter((b) => b.genre === genre);
  if (params.key) beats = beats.filter((b) => b.musicalKey === params.key);
  if (q) {
    beats = beats.filter((b) =>
      [b.title, b.genre, b.mood, b.musicalKey, ...b.tags].join(" ").toLowerCase().includes(q),
    );
  }
  const sorter = SORTS[sort] ?? SORTS.newest;
  beats = [...beats].sort(sorter);

  const genres = [...new Set(data.beats.filter((b) => b.published).map((b) => b.genre))].sort();
  const keys = [...new Set(data.beats.filter((b) => b.published).map((b) => b.musicalKey))].sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <SectionHeading
        eyebrow="The vault"
        title="Beat store"
        subtitle="Every beat is mixed, mastered and ready to place. Preview before you pay — your files are emailed the moment payment clears."
      />

      {/* filters */}
      <form method="get" className="card mb-8 p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div>
            <label className="label" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Title, mood, tag…"
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="genre">
              Genre
            </label>
            <select id="genre" name="genre" defaultValue={genre} className="input">
              <option value="">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="sort">
              Sort by
            </label>
            <select id="sort" name="sort" defaultValue={sort} className="input">
              <option value="newest">Newest first</option>
              <option value="popular">Most played</option>
              <option value="best">Best selling</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="az">A–Z</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="btn btn-primary">
              Apply
            </button>
            <Link href="/beats" className="btn btn-ghost">
              Reset
            </Link>
          </div>
        </div>

        {keys.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">Key</span>
            <Link
              href={buildQuery({ q, genre, sort })}
              className={`chip ${!params.key ? "!border-brand/50 !text-white" : ""}`}
            >
              Any
            </Link>
            {keys.map((k) => (
              <Link
                key={k}
                href={buildQuery({ q, genre, sort, key: k })}
                className={`chip ${params.key === k ? "!border-brand/50 !text-white" : ""}`}
              >
                {k}
              </Link>
            ))}
          </div>
        )}
      </form>

      <p className="mb-5 text-xs text-muted-2">
        {beats.length} beat{beats.length === 1 ? "" : "s"} found
        {genre ? ` in ${genre}` : ""}
        {q ? ` for “${params.q}”` : ""}
      </p>

      {beats.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {beats.map((beat) => (
            <BeatCard
              key={beat.id}
              beat={beat}
              currency={settings.currency}
              currencySymbol={settings.currencySymbol}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No beats match those filters"
          message="Try a different genre, key or search term — or reset the filters to see the full vault."
          action={{ href: "/beats", label: "Reset filters" }}
        />
      )}
    </div>
  );
}

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `/beats?${qs}` : "/beats";
}
