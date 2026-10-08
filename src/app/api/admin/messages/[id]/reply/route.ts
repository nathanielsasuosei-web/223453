import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { notifyMessageReply } from "@/lib/notifications";
import { db, persist, uid } from "@/lib/store";

/** Admin replies to an artist's message — the reply is emailed to them. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const text = str(body.body);
    if (text.length < 2) return badRequest("Write a reply first.");

    const data = db();
    const message = data.messages.find((m) => m.id === id);
    if (!message) return badRequest("Conversation not found.");

    const reply = { id: uid("rep"), body: text, from: "ADMIN" as const, createdAt: new Date().toISOString() };
    message.replies.push(reply);
    message.status = "REPLIED";
    persist("messages");

    await notifyMessageReply(message, text);
    return Response.json({ ok: true, replyId: reply.id, emailedTo: message.email });
  } catch (err) {
    return serverError(err, "admin reply message");
  }
}
