import { badRequest, requireAdminApi, serverError } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";

/**
 * Producer deletes an account. Orders keep their denormalized buyer details,
 * and that account's messages/downloads simply stop resolving to it.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    if (id === guard.admin.id) {
      return badRequest("You can't delete your own producer account.");
    }

    const data = db();
    const index = data.users.findIndex((u) => u.id === id);
    if (index === -1) return badRequest("Account not found.");

    const [removed] = data.users.splice(index, 1);
    persist("users");
    return Response.json({ ok: true, id: removed.id });
  } catch (err) {
    return serverError(err, "admin delete user");
  }
}
