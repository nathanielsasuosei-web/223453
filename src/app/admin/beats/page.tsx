import type { Metadata } from "next";
import { db } from "@/lib/store";
import { BeatManager } from "@/components/admin/BeatManager";
import { artworkUrl } from "@/lib/media";

export const metadata: Metadata = {
  title: "Beats",
};

export default function AdminBeatsPage() {
  const data = db();
  const licenses = data.licenses
    .filter((l) => l.active)
    .sort((a, b) => a.sort - b.sort)
    .map((l) => ({ id: l.id, name: l.name, slug: l.slug }));

  const beats = data.beats.map((beat) => ({
    id: beat.id,
    slug: beat.slug,
    title: beat.title,
    genre: beat.genre,
    bpm: beat.bpm,
    musicalKey: beat.musicalKey,
    mood: beat.mood,
    priceCents: beat.priceCents,
    description: beat.description,
    tags: beat.tags,
    artwork: artworkUrl(beat),
    durationSec: beat.durationSec,
    plays: beat.plays,
    sales: beat.sales,
    published: beat.published,
    featured: beat.featured,
    files: beat.files.map((f) => ({
      id: f.id,
      name: f.name,
      kind: f.kind,
      sizeBytes: f.sizeBytes,
      tier: f.tier,
      tierName: f.tier === "*" ? "All licenses" : (licenses.find((l) => l.slug === f.tier)?.name ?? f.tier),
    })),
  }));

  return <BeatManager beats={beats} licenses={licenses} />;
}

