import { badRequest, bool, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist, slugify, uid } from "@/lib/store";

/** Admin creates or updates a license tier. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const data = db();
    const id = str(body.id);

    const includes = Array.isArray(body.includes)
      ? body.includes.map((i: unknown) => String(i).trim()).filter(Boolean)
      : str(body.includes).split("\n").map((i) => i.trim()).filter(Boolean);

    const name = str(body.name);
    if (!name) return badRequest("Give the license a name.");

    const priceCents = body.priceCents !== undefined ? int(body.priceCents) : Math.round(Number(body.price ?? 0) * 100);

    if (id) {
      const license = data.licenses.find((l) => l.id === id);
      if (!license) return badRequest("License not found.");
      Object.assign(license, {
        name,
        slug: slugify(name) || license.slug,
        priceCents,
        description: str(body.description),
        includes,
        distribution: str(body.distribution) || "—",
        streams: str(body.streams) || "—",
        videos: str(body.videos) || "—",
        radio: bool(body.radio),
        exclusive: bool(body.exclusive),
        active: body.active !== undefined ? bool(body.active) : license.active,
        sort: int(body.sort, license.sort),
      });
      persist("licenses");
      return Response.json({ ok: true, license });
    }

    const license = {
      id: uid("lic"),
      name,
      slug: slugify(name) || `license-${Date.now()}`,
      priceCents,
      description: str(body.description),
      includes,
      distribution: str(body.distribution) || "—",
      streams: str(body.streams) || "—",
      videos: str(body.videos) || "—",
      radio: bool(body.radio),
      exclusive: bool(body.exclusive),
      active: body.active !== undefined ? bool(body.active) : true,
      sort: int(body.sort, data.licenses.length + 1),
    };
    data.licenses.push(license);
    persist("licenses");
    return Response.json({ ok: true, license });
  } catch (err) {
    return serverError(err, "admin save license");
  }
}
