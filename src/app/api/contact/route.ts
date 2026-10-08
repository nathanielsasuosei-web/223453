import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyMessageReceived } from "@/lib/notifications";
import { db, persist, uid } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (subject.length < 3) return NextResponse.json({ error: "Please add a subject." }, { status: 400 });
    if (message.length < 10) {
      return NextResponse.json({ error: "Your message is a little short — add a bit more detail." }, { status: 400 });
    }

    const current = await getCurrentUser();
    const data = db();
    const entry = {
      id: uid("msg"),
      userId: current?.user.id ?? null,
      name,
      email,
      subject,
      body: message,
      status: "NEW" as const,
      createdAt: new Date().toISOString(),
      replies: [],
    };
    data.messages.unshift(entry);
    persist("messages");
    await notifyMessageReceived(entry);

    return NextResponse.json({ ok: true, messageId: entry.id });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }
}
