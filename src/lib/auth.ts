import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR, userByEmail } from "./store";
import type { Role, User } from "./store";

export const SESSION_COOKIE = "bf_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function getSecret(): Uint8Array {
  const fromEnv = process.env.JWT_SECRET;
  if (fromEnv) return new TextEncoder().encode(fromEnv);
  // Persist a dev secret so sessions survive restarts
  try {
    const file = path.join(DATA_DIR, ".secret");
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(file)) return new TextEncoder().encode(fs.readFileSync(file, "utf8").trim());
    const secret = crypto.randomBytes(48).toString("hex");
    fs.writeFileSync(file, secret, { mode: 0o600 });
    return new TextEncoder().encode(secret);
  } catch {
    return new TextEncoder().encode("beatforge-dev-secret-change-me");
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

async function signSession(user: SessionUser) {
  return new SignJWT({ role: user.role, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function createSession(user: SessionUser) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
      role: (payload.role as Role) ?? "ARTIST",
    };
  } catch {
    return null;
  }
}

/** Session + full DB record. */
export async function getCurrentUser(): Promise<(SessionUser & { user: User }) | null> {
  const session = await getSession();
  if (!session) return null;
  const user = userByEmail(session.email);
  if (!user) return null;
  return { ...session, name: user.name, role: user.role, user };
}

export async function requireUser(redirectTo = "/login"): Promise<SessionUser & { user: User }> {
  const current = await getCurrentUser();
  if (!current) {
    const { redirect } = await import("next/navigation");
    return redirect(redirectTo);
  }
  return current;
}

export async function requireAdmin(
  redirectTo = "/login?next=/admin",
): Promise<SessionUser & { user: User }> {
  const current = await getCurrentUser();
  if (!current) {
    const { redirect } = await import("next/navigation");
    return redirect(redirectTo);
  }
  if (current.role !== "ADMIN") {
    const { redirect } = await import("next/navigation");
    return redirect("/account?error=admin-only");
  }
  return current;
}
