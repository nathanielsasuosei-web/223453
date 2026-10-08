import { badRequest, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";

/** Admin updates a conversation status (NEW / REPLIED / CLOSED) or marks emails read. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const data = db();
    const message = data.messages.find((m) => m.id === id);
    if (!message) return badRequest("Conversation not found.");

    const status = str(body.status).toUpperCase();
    if (status === "NEW" || status === "REPLIED" || status === "CLOSED") message.status = status;
    persist("messages");
    return Response.json({ ok: true, status: message.status });
  } catch (err) {
    return serverError(err, "admin update message");
  }
}
