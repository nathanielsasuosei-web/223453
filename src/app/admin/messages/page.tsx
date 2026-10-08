import type { Metadata } from "next";
import { db } from "@/lib/store";
import { MessageManager } from "@/components/admin/MessageManager";

export const metadata: Metadata = {
  title: "Messages",
};

export default async function AdminMessagesPage() {
  const data = db();
  const messages = [...data.messages]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      subject: m.subject,
      body: m.body,
      status: m.status,
      createdAt: m.createdAt,
      hasAccount: Boolean(m.userId),
      replies: m.replies.map((r) => ({ ...r })),
    }));

  return (
    <MessageManager messages={messages} replyToEmail={data.settings.contactEmail} />
  );
}
