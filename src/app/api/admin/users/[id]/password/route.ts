import { badRequest, requireAdminApi, serverError } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { db, persist } from "@/lib/store";

/** Producer sets a new password for any account (e.g. an artist who is locked out). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    if (password.length < 8) return badRequest("Password must be at least 8 characters.");

    const target = db().users.find((u) => u.id === id);
    if (!target) return badRequest("Account not found.");

    target.passwordHash = await hashPassword(password);
    persist("users");
    return Response.json({ ok: true, id: target.id });
  } catch (err) {
    return serverError(err, "admin reset password");
  }
}
