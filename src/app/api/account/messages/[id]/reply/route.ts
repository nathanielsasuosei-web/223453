import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { notifyMessageReceived } from "@/lib/notifications";
import { db, persist, uid } from "@/lib/store";

/** Artist replies inside an existing thread. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const data = db();
  const message = data.messages.find((m) => m.id === id);
  if (!message || message.userId !== current.user.id) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const text = String(body.body ?? "").trim();
    if (text.length < 2) return NextResponse.json({ error: "Write a reply first." }, { status: 400 });

    const reply = { id: uid("rep"), body: text, from: "USER" as const, createdAt: new Date().toISOString() };
    message.replies.push(reply);
    message.status = "NEW";
    persist("messages");

    // Let the studio know there's a new reply waiting (same email as a new message)
    await notifyMessageReceived({
      ...message,
      subject: `Re: ${message.subject}`,
      body: text,
      name: current.user.name,
      email: current.user.email,
    });

    return NextResponse.json({ ok: true, replyId: reply.id });
  } catch (err) {
    console.error("[account reply]", err);
    return NextResponse.json({ error: "Could not send your reply." }, { status: 500 });
  }
}
