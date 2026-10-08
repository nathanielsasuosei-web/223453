"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";
import { Badge, Spinner } from "../ui";

interface Reply {
  id: string;
  body: string;
  from: "ADMIN" | "USER";
  createdAt: string;
}

interface Message {
  id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: "NEW" | "REPLIED" | "CLOSED";
  createdAt: string;
  hasAccount: boolean;
  replies: Reply[];
}

const FILTERS = [
  { id: "ALL", label: "All" },
  { id: "NEW", label: "New" },
  { id: "REPLIED", label: "Replied" },
  { id: "CLOSED", label: "Closed" },
];

export function MessageManager({
  messages: initialMessages,
  replyToEmail,
}: {
  messages: Message[];
  replyToEmail: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(initialMessages[0]?.id ?? null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const visible = messages.filter((m) => (filter === "ALL" ? true : m.status === filter));
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  async function sendReply() {
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/messages/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the reply.");

      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? {
                ...m,
                status: "REPLIED",
                replies: [
                  ...m.replies,
                  { id: data.replyId ?? `r_${Date.now()}`, body: draft, from: "ADMIN", createdAt: new Date().toISOString() },
                ],
              }
            : m,
        ),
      );
      setDraft("");
      setNotice(`Reply emailed to ${data.emailedTo ?? selected.email}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  async function setStatus(id: string, status: "NEW" | "REPLIED" | "CLOSED") {
    setError("");
    try {
      const res = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Could not update.");
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Messages</h2>
        <p className="mt-1 text-xs text-muted">
          Every message from the website lands here and is emailed to {replyToEmail}. Replies are sent to
          the artist&apos;s inbox.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`chip ${filter === f.id ? "!border-brand/60 !text-white" : ""}`}
          >
            {f.label}
            <span className="text-muted-2">
              {f.id === "ALL" ? messages.length : messages.filter((m) => m.status === f.id).length}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="card overflow-hidden">
          <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
            {visible.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => {
                    setSelectedId(m.id);
                    setNotice("");
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedId === m.id ? "bg-panel-2" : "hover:bg-panel/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                    {m.status === "NEW" && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />}
                  </div>
                  <p className="truncate text-xs text-muted">{m.subject}</p>
                  <p className="mt-0.5 text-[11px] text-muted-2">
                    {timeAgo(m.createdAt)} · {m.replies.length} repl{m.replies.length === 1 ? "y" : "ies"}
                  </p>
                </button>
              </li>
            ))}
          </ul>
          {visible.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted">Nothing here.</p>
          )}
        </div>

        <div className="card flex min-h-[440px] flex-col">
          {selected ? (
            <>
              <div className="border-b border-line px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-white">{selected.subject}</h3>
                    <p className="mt-1 text-xs text-muted">
                      From <span className="font-semibold text-white">{selected.name}</span> ·{" "}
                      <a href={`mailto:${selected.email}`} className="link">
                        {selected.email}
                      </a>{" "}
                      · {timeAgo(selected.createdAt)}
                      {selected.hasAccount && " · has an artist account"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={selected.status === "NEW" ? "amber" : selected.status === "REPLIED" ? "green" : "slate"}>
                      {selected.status}
                    </Badge>
                    {selected.status !== "CLOSED" ? (
                      <button
                        onClick={() => setStatus(selected.id, "CLOSED")}
                        className="btn btn-ghost !px-2.5 !py-1 text-xs"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        onClick={() => setStatus(selected.id, "NEW")}
                        className="btn btn-ghost !px-2.5 !py-1 text-xs"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                <div className="rounded-2xl border border-line bg-ink-2 px-4 py-3">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{selected.body}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-2">
                    {selected.name} · {timeAgo(selected.createdAt)}
                  </p>
                </div>
                {selected.replies.map((r) => (
                  <div
                    key={r.id}
                    className={`flex ${r.from === "ADMIN" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
                        r.from === "ADMIN"
                          ? "border-brand/40 bg-brand/12 text-violet-50"
                          : "border-line bg-ink-2 text-muted"
                      }`}
                    >
                      <p className="whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-2">
                        {r.from === "ADMIN" ? "You" : selected.name} · {timeAgo(r.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-line p-4">
                <label className="label" htmlFor="admin-reply">
                  Reply by email
                </label>
                <textarea
                  id="admin-reply"
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="input resize-y"
                  placeholder={`Write your reply to ${selected.name}…`}
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    onClick={sendReply}
                    disabled={sending || draft.trim().length < 2}
                    className="btn btn-primary text-xs"
                  >
                    {sending ? (
                      <>
                        <Spinner /> Sending…
                      </>
                    ) : (
                      "Send reply to artist"
                    )}
                  </button>
                  <a href={`mailto:${selected.email}?subject=Re: ${selected.subject}`} className="btn btn-ghost text-xs">
                    Open in mail app
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-10 text-center">
              <p className="text-sm text-muted">Select a message to read and reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
