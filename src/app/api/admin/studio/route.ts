import { bool, cents, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, mergeStudio, persist, type StudioService } from "@/lib/store";

const WEEKDAYS = ["0", "1", "2", "3", "4", "5", "6"];
const MAX = { short: 120, long: 900 };

function text(value: unknown, fallback: string, max = MAX.short) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function timeOf(value: unknown, fallback: string) {
  const v = str(value);
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(v)) return fallback;
  return v;
}

/** Producer edits the studio: opening hours, services, deposit % and policy. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const settings = db().settings;
    const studioBody = (body.studio ?? {}) as Record<string, unknown>;
    const cur = settings.studio;

    const hours: typeof cur.hours = { ...cur.hours };
    const hoursBody = (studioBody.hours ?? {}) as Record<string, Record<string, unknown>>;
    for (const day of WEEKDAYS) {
      const entry = hoursBody[day] ?? {};
      const prev = hours[day] ?? { open: "09:00", close: "21:00", closed: false };
      hours[day] = {
        open: timeOf(entry.open, prev.open),
        close: timeOf(entry.close, prev.close),
        closed: bool(entry.closed ?? prev.closed),
      };
      if (hours[day].close <= hours[day].open) hours[day].close = prev.close;
    }

    settings.studio = mergeStudio({
      enabled: bool(studioBody.enabled ?? cur.enabled),
      eyebrow: text(studioBody.eyebrow, cur.eyebrow),
      title: text(studioBody.title, cur.title) || cur.title,
      subtitle: text(studioBody.subtitle, cur.subtitle, MAX.long),
      address: text(studioBody.address, cur.address, 160),
      depositPercent: Math.max(1, Math.min(100, int(studioBody.depositPercent, cur.depositPercent))),
      slotMinutes: [30, 60, 90, 120].includes(int(studioBody.slotMinutes, cur.slotMinutes))
        ? int(studioBody.slotMinutes, cur.slotMinutes)
        : cur.slotMinutes,
      leadTimeHours: Math.max(0, Math.min(720, int(studioBody.leadTimeHours, cur.leadTimeHours))),
      maxDaysAhead: Math.max(1, Math.min(365, int(studioBody.maxDaysAhead, cur.maxDaysAhead))),
      policy: text(studioBody.policy, cur.policy, MAX.long),
      hours,
    });

    if (Array.isArray(body.services)) {
      const existing = settings.services;
      settings.services = (body.services as Record<string, unknown>[])
        .map((raw, index) => {
          const prev = existing.find((s) => s.id === str(raw?.id));
          const name = text(raw?.name, prev?.name ?? "", 60);
          if (!name) return null;
          const minHours = Math.max(1, Math.min(24, int(raw?.minHours, prev?.minHours ?? 1)));
          const maxHours = Math.max(minHours, Math.min(24, int(raw?.maxHours, prev?.maxHours ?? minHours)));
          const service: StudioService = {
            id: prev?.id ?? `svc_${Math.random().toString(36).slice(2, 10)}`,
            slug: prev?.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            name,
            blurb: text(raw?.blurb, prev?.blurb ?? "", 400),
            priceCents: Math.max(0, cents(raw?.price)),
            minHours,
            maxHours,
            active: bool(raw?.active ?? prev?.active ?? true),
            sort: int(raw?.sort, prev?.sort ?? index + 1),
          };
          return service;
        })
        .filter((s): s is StudioService => Boolean(s))
        .sort((a, b) => a.sort - b.sort);
    }

    if (body.allowHalfPayments !== undefined) {
      settings.allowHalfPayments = bool(body.allowHalfPayments);
    }

    persist("settings");
    return Response.json({ ok: true, studio: settings.studio, services: settings.services });
  } catch (err) {
    return serverError(err, "admin update studio settings");
  }
}
