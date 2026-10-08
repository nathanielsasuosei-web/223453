"use client";

import { useState } from "react";
import { timeAgo } from "@/lib/format";

interface Email {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  kind: string;
  attachments: string[];
  status: "sent" | "outbox";
  error: string | null;
  createdAt: string;
  read: boolean;
}

const KIND_LABELS: Record<string, string> = {
  WELCOME: "Welcome",
  ORDER_CREATED: "Order created",
  PAYMENT_INSTRUCTIONS: "Payment instructions",
  ADMIN_NEW_ORDER: "New order alert",
  BEAT_DELIVERED: "Beat delivered",
  ORDER_CANCELLED: "Order cancelled",
  MESSAGE_RECEIVED: "Message received",
  MESSAGE_REPLY: "Message reply",
};

export function EmailOutbox({ emails }: { emails: Email[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  const visible = emails.filter((e) => (filter === "ALL" ? true : e.kind === filter));
  const kinds = [...new Set(emails.map((e) => e.kind))];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`chip ${filter === "ALL" ? "!border-brand/60 !text-white" : ""}`}
        >
          All <span className="text-muted-2">{emails.length}</span>
        </button>
        {kinds.map((kind) => (
          <button
            key={kind}
            onClick={() => setFilter(kind)}
            className={`chip ${filter === kind ? "!border-brand/60 !text-white" : ""}`}
          >
            {KIND_LABELS[kind] ?? kind}{" "}
            <span className="text-muted-2">{emails.filter((e) => e.kind === kind).length}</span>
          </button>
        ))}
      </div>

      <div className="card divide-y divide-line overflow-hidden">
        {visible.map((email) => {
          const open = openId === email.id;
          return (
            <div key={email.id}>
              <button
                onClick={() => setOpenId(open ? null : email.id)}
                className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-panel/40"
              >
                <span
                  className={`badge ${
                    email.status === "sent"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-sky-500/15 text-sky-300"
                  }`}
                >
                  {email.status === "sent" ? "sent" : "outbox"}
                </span>
                <span className="chip !text-[10px]">{KIND_LABELS[email.kind] ?? email.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{email.subject}</span>
                  <span className="block truncate text-xs text-muted-2">to {email.to}</span>
                </span>
                {email.attachments.length > 0 && (
                  <span className="chip !text-[10px]">📎 {email.attachments.length}</span>
                )}
                <span className="text-xs text-muted-2">{timeAgo(email.createdAt)}</span>
              </button>

              {open && (
                <div className="border-t border-line bg-ink-2 px-5 py-4">
                  <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-2">
                    <span>
                      From: <span className="text-muted">{email.from}</span>
                    </span>
                    <span>
                      To: <span className="text-muted">{email.to}</span>
                    </span>
                    {email.attachments.length > 0 && (
                      <span>Attachments: {email.attachments.join(", ")}</span>
                    )}
                    {email.error && <span className="text-rose-300">Error: {email.error}</span>}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-line bg-white">
                    <iframe
                      title={`Email preview: ${email.subject}`}
                      srcDoc={email.html}
                      sandbox=""
                      className="h-[420px] w-full"
                    />
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs font-semibold text-muted">
                      Plain text version
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-ink p-3 text-xs text-muted">
                      {email.text}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted">
            No emails captured yet — they will appear here as soon as the site sends one.
          </p>
        )}
      </div>
    </div>
  );
}
