import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PlayerProvider } from "@/components/PlayerProvider";
import { Reveal } from "@/components/Reveal";
import { db } from "@/lib/store";
import { AnnouncementBar } from "@/components/AnnouncementBar";

const BASE_METADATA: Metadata = {
  description:
    "Buy exclusive and leased beats from a professional music producer. Pay with mobile money or bank transfer and receive your files instantly by email.",
  keywords: [
    "beats for sale",
    "buy beats",
    "afrobeats instrumental",
    "amapiano beat",
    "type beat",
    "music producer",
    "mobile money beats",
  ],
  authors: [{ name: "BeatForge Studio" }],
  openGraph: {
    title: "BeatForge — Beats & visuals from the studio",
    description:
      "Professional beats for serious artists. Instant email delivery, mobile money & bank payments.",
    type: "website",
  },
};

export function generateMetadata(): Metadata {
  const brand = db().settings.site.brandName;
  return {
    ...BASE_METADATA,
    title: {
      default: `${brand} — Beats & visuals from the studio`,
      template: `%s · ${brand}`,
    },
    openGraph: { ...BASE_METADATA.openGraph, title: `${brand} — Beats & visuals from the studio` },
  };
}

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = db().settings;
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-ink text-[15px] leading-relaxed antialiased">
        <PlayerProvider>
          <div className="flex min-h-screen flex-col">
            <AnnouncementBar content={settings.site.announcement} />
            <SiteHeader producerName={settings.producerName} brandName={settings.site.brandName} />
            <main className="flex-1">{children}</main>
            <SiteFooter settings={settings} />
          </div>
        </PlayerProvider>
        <Reveal />
      </body>
    </html>
  );
}
