import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist, type Role } from "@/lib/store";

/** Producer sets an account's role (artist ↔ producer). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const role = str(body.role).toUpperCase();
    if (role !== "ADMIN" && role !== "ARTIST") {
      return badRequest("Role must be ADMIN or ARTIST.");
    }

    const data = db();
    const target = data.users.find((u) => u.id === id);
    if (!target) return badRequest("Account not found.");
    if (target.id === guard.admin.id) {
      return badRequest("You can't change your own role.");
    }

    target.role = role as Role;
    persist("users");
    return Response.json({ ok: true, id: target.id, role: target.role });
  } catch (err) {
    return serverError(err, "admin set role");
  }
}
