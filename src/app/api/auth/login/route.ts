import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { userByEmail } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const user = userByEmail(email);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ ok: true, redirect: user.role === "ADMIN" ? "/admin" : "/account" });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Could not log you in. Please try again." }, { status: 500 });
  }
}
