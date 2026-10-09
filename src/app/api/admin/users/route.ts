import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { db, persist, uid, userByEmail, type Role } from "@/lib/store";

/** Producer creates an account directly (producer or artist) — no access code needed. */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json().catch(() => ({}));
    const name = str(body.name);
    const email = str(body.email).toLowerCase();
    const phone = str(body.phone);
    const password = typeof body.password === "string" ? body.password : "";
    const role = str(body.role).toUpperCase();

    if (name.length < 2) return badRequest("Please enter a name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest("Please enter a valid email address.");
    if (password.length < 8) return badRequest("Password must be at least 8 characters.");
    if (role !== "ADMIN" && role !== "ARTIST") return badRequest("Role must be ADMIN (producer) or ARTIST.");
    if (userByEmail(email)) return badRequest("An account with that email already exists.");

    const data = db();
    const user = {
      id: uid("usr"),
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      role: role as Role,
      country: "",
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    persist("users");

    return Response.json({
      ok: true,
      user: { id: user.id, name, email, phone, role: user.role, createdAt: user.createdAt, orders: 0 },
    });
  } catch (err) {
    return serverError(err, "admin create user");
  }
}
