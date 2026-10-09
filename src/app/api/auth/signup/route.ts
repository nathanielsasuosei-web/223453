import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { notifyWelcome } from "@/lib/notifications";
import { db, persist, uid, userByEmail, type Role } from "@/lib/store";

/**
 * Access code required to open a producer account through the signup form.
 * Set PRODUCER_SIGNUP_CODE in the environment to change it.
 */
const PRODUCER_SIGNUP_CODE = process.env.PRODUCER_SIGNUP_CODE || "beatforge-producer";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const phone = String(body.phone ?? "").trim();
    const password = String(body.password ?? "");
    const accountType = String(body.accountType ?? "").trim().toLowerCase();
    const producerCode = String(body.producerCode ?? "").trim();

    if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (userByEmail(email)) {
      return NextResponse.json({ error: "An account with that email already exists — try logging in." }, { status: 409 });
    }

    const wantsProducer = accountType === "producer" || accountType === "admin";
    if (wantsProducer && producerCode !== PRODUCER_SIGNUP_CODE) {
      return NextResponse.json(
        { error: "That producer access code is not valid. Producer accounts need the code set by the site owner." },
        { status: 403 },
      );
    }

    const data = db();
    const isFirstUser = data.users.length === 0;
    const role: Role = wantsProducer ? "ADMIN" : isFirstUser ? "ADMIN" : "ARTIST";
    const user = {
      id: uid("usr"),
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      role,
      country: "",
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    persist("users");

    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    await notifyWelcome(user);

    return NextResponse.json({
      ok: true,
      redirect: user.role === "ADMIN" ? "/admin" : "/account",
    });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "Could not create your account. Please try again." }, { status: 500 });
  }
}
