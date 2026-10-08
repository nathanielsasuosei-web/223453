import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyMessageReceived } from "@/lib/notifications";
import { db, persist, uid } from "@/lib/store";

/** Artist starts a new conversation from their account. */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  try {
    const body = await request.json();
    const subject = String(body.subject ?? "").trim();
    const message = String(body.body ?? "").trim();
    if (subject.length < 3) return NextResponse.json({ error: "Please add a subject." }, { status: 400 });
    if (message.length < 10) {
      return NextResponse.json({ error: "Your message is a little short." }, { status: 400 });
    }

    const data = db();
    const entry = {
      id: uid("msg"),
      userId: current.user.id,
      name: current.user.name,
      email: current.user.email,
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
    console.error("[account messages]", err);
    return NextResponse.json({ error: "Could not send your message." }, { status: 500 });
  }
}
