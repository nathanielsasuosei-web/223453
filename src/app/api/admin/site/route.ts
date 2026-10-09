import { requireAdminApi, serverError } from "@/lib/api-guard";
import { db, mergeSite, persist, type SiteContent } from "@/lib/store";

const MAX = { short: 120, long: 600 };

function text(value: unknown, fallback: string, max = MAX.short) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

/** Only allow site-relative links or http(s) URLs — never javascript: etc. */
function href(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const v = value.trim().slice(0, 300);
  if (!v) return "";
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  if (/^https?:\/\//i.test(v)) return v;
  return fallback;
}

/** Producer edits the website's own copy, banner and section visibility. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = (await request.json().catch(() => ({}))) as Partial<Record<keyof SiteContent, Record<string, unknown>>> & {
      brandName?: unknown;
      footerNote?: unknown;
    };
    const settings = db().settings;
    const cur = settings.site;
    const a = (body.announcement ?? {}) as Record<string, unknown>;
    const h = (body.hero ?? {}) as Record<string, unknown>;
    const b = (body.beatsSection ?? {}) as Record<string, unknown>;
    const v = (body.videosSection ?? {}) as Record<string, unknown>;
    const c = (body.contact ?? {}) as Record<string, unknown>;

    const next: SiteContent = {
      brandName: text(body.brandName, cur.brandName, 40) || cur.brandName,
      announcement: {
        enabled: flag(a.enabled, cur.announcement.enabled),
        text: text(a.text, cur.announcement.text, 200),
        linkLabel: text(a.linkLabel, cur.announcement.linkLabel, 40),
        linkHref: href(a.linkHref, cur.announcement.linkHref),
      },
      hero: {
        eyebrow: text(h.eyebrow, cur.hero.eyebrow),
        headline: text(h.headline, cur.hero.headline),
        highlight: text(h.highlight, cur.hero.highlight),
        subtitle: text(h.subtitle, cur.hero.subtitle, MAX.long),
        primaryLabel: text(h.primaryLabel, cur.hero.primaryLabel, 40),
        primaryHref: href(h.primaryHref, cur.hero.primaryHref),
        secondaryLabel: text(h.secondaryLabel, cur.hero.secondaryLabel, 40),
        secondaryHref: href(h.secondaryHref, cur.hero.secondaryHref),
        showStats: flag(h.showStats, cur.hero.showStats),
      },
      beatsSection: {
        show: flag(b.show, cur.beatsSection.show),
        eyebrow: text(b.eyebrow, cur.beatsSection.eyebrow),
        title: text(b.title, cur.beatsSection.title) || cur.beatsSection.title,
        subtitle: text(b.subtitle, cur.beatsSection.subtitle, MAX.long),
      },
      videosSection: {
        show: flag(v.show, cur.videosSection.show),
        eyebrow: text(v.eyebrow, cur.videosSection.eyebrow),
        title: text(v.title, cur.videosSection.title) || cur.videosSection.title,
        subtitle: text(v.subtitle, cur.videosSection.subtitle, MAX.long),
      },
      contact: {
        title: text(c.title, cur.contact.title) || cur.contact.title,
        subtitle: text(c.subtitle, cur.contact.subtitle, MAX.long),
      },
      footerNote: text(body.footerNote, cur.footerNote, 200),
    };

    settings.site = mergeSite(next);
    persist("settings");
    return Response.json({ ok: true, site: settings.site });
  } catch (err) {
    return serverError(err, "admin update site content");
  }
}
