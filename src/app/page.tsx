import { db } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { Hero, type HeroBeat } from "@/components/Hero";
import { BeatCard } from "@/components/BeatCard";
import { VideoCard } from "@/components/VideoCard";
import { GlassNavbar } from "@/components/GlassNavbar";
import { HomeSidebar } from "@/components/HomeSidebar";
import { SectionHeading } from "@/components/ui";
import { toPlayerBeat } from "@/lib/media";

export default async function HomePage() {
  const data = db();
  const current = await getCurrentUser();
  const settings = data.settings;
  const published = data.beats.filter((b) => b.published);
  const featured = published.filter((b) => b.featured).slice(0, 3);
  const showcase = (featured.length ? featured : published).slice(0, 6);
  const videos = data.videos.filter((v) => v.published).slice(0, 3);
  const artists = data.users.filter((u) => u.role === "ARTIST").length;
  const delivered = data.downloads.reduce((sum, d) => sum + d.count, 0);

  const heroBeat: HeroBeat | null = showcase[0]
    ? {
        slug: showcase[0].slug,
        title: showcase[0].title,
        genre: showcase[0].genre,
        bpm: showcase[0].bpm,
        musicalKey: showcase[0].musicalKey,
        priceCents: showcase[0].priceCents,
        artwork: showcase[0].artwork ? `/api/files/${showcase[0].artwork}` : "",
        audioUrl: toPlayerBeat(showcase[0]).audioUrl,
      }
    : null;

  return (
    <div className="bg-black">
      <GlassNavbar
        user={current ? { name: current.name, email: current.email, role: current.role } : null}
      />

      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-6 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <HomeSidebar
            producerName={settings.producerName}
            user={
              current ? { name: current.name, email: current.email, role: current.role } : null
            }
          />

          <div className="min-w-0">
            <Hero
              featured={heroBeat}
              genres={[...new Set([...published.map((b) => b.genre), "Afrobeats", "Amapiano", "Hip-Hop", "R&B"])].slice(0, 10)}
              currencySymbol={settings.currencySymbol}
              currency={settings.currency}
              beatCount={published.length}
              artistCount={Math.max(artists, 120)}
              deliveredCount={Math.max(delivered, 340)}
            />

            {/* -------------------------------------------------- featured beats */}
            <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
              <SectionHeading
                eyebrow="Fresh out the vault"
                title="Beats ready to lease"
                subtitle="Preview any beat right here. Lease it, or make it yours exclusively — the files are yours the second payment clears."
                action={{ href: "/beats", label: "View all beats" }}
              />
              {showcase.length ? (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {showcase.map((beat) => (
                    <BeatCard
                      key={beat.id}
                      beat={beat}
                      currency={settings.currency}
                      currencySymbol={settings.currencySymbol}
                    />
                  ))}
                </div>
              ) : (
                <div className="card p-10 text-center text-sm text-muted">
                  No beats published yet — the producer can upload them from the admin studio.
                </div>
              )}
            </section>

            {/* ------------------------------------------------------ videos */}
            {videos.length > 0 && (
              <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
                <SectionHeading
                  eyebrow="Visuals"
                  title="Videos from the studio"
                  subtitle="Sessions, beat breakdowns and visuals shot in the studio."
                  action={{ href: "/videos", label: "All videos" }}
                />
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
