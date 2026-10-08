import { badRequest, requireAdminApi, serverError } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const data = db();
    const index = data.licenses.findIndex((l) => l.id === id);
    if (index === -1) return badRequest("License not found.");
    data.licenses.splice(index, 1);
    persist("licenses");
    return Response.json({ ok: true });
  } catch (err) {
    return serverError(err, "admin delete license");
  }
}
