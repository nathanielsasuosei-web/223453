"use client";

import { useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { Badge, Spinner } from "./ui";

interface Reply {
  id: string;
  body: string;
  from: "ADMIN" | "USER";
  createdAt: string;
}

interface Thread {
  id: string;
  subject: string;
  body: string;
  status: "NEW" | "REPLIED" | "CLOSED";
  createdAt: string;
  replies: Reply[];
}

export function AccountMessages({ messages }: { messages: Thread[] }) {
  const [threads, setThreads] = useState<Thread[]>(messages);
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [composing, setComposing] = useState(messages.length === 0);

  const selected = threads.find((t) => t.id === selectedId) ?? null;

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/account/messages/${selected.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send your reply.");
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selected.id
            ? {
                ...t,
                status: "NEW",
                replies: [
                  ...t.replies,
                  {
                    id: data.replyId ?? `r_${Date.now()}`,
                    body: reply,
                    from: "USER",
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : t,
        ),
      );
      setReply("");
      setNotice("Reply sent — the studio has been emailed. Expect an answer by email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  async function sendNew(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/account/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: newSubject, body: newBody }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send your message.");
      const thread: Thread = {
        id: data.messageId ?? `m_${Date.now()}`,
        subject: newSubject,
        body: newBody,
        status: "NEW",
        createdAt: new Date().toISOString(),
        replies: [],
      };
      setThreads((prev) => [thread, ...prev]);
      setSelectedId(thread.id);
      setNewSubject("");
      setNewBody("");
      setComposing(false);
      setNotice("Message sent — the producer has been emailed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Conversations</h2>
          <button
            onClick={() => {
              setComposing((v) => !v);
              setSelectedId(null);
              setNotice("");
            }}
            className="btn btn-ghost !px-2.5 !py-1 text-xs"
          >
            {composing ? "Cancel" : "New"}
          </button>
        </div>
        {threads.length ? (
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    setSelectedId(t.id);
                    setComposing(false);
                    setNotice("");
                  }}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    selectedId === t.id ? "bg-panel-2" : "hover:bg-panel/60"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-white">{t.subject}</p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-2">{t.body}</p>
                  <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-2">
                    {timeAgo(t.createdAt)}
                    {t.replies.length > 0 && <span>· {t.replies.length} replies</span>}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-muted">No conversations yet.</p>
        )}
      </div>

      <div className="card flex min-h-[420px] flex-col">
        {composing ? (
          <form onSubmit={sendNew} className="flex flex-1 flex-col gap-4 p-6">
            <h2 className="text-lg font-bold text-white">New message to the studio</h2>
            <div>
              <label className="label" htmlFor="newSubject">
                Subject
              </label>
              <input
                id="newSubject"
                required
                minLength={3}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="input"
                placeholder="Custom beat, licensing question…"
              />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="newBody">
                Message
              </label>
              <textarea
                id="newBody"
                required
                minLength={10}
                rows={7}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="input resize-y"
                placeholder="Tell the studio what you need…"
              />
            </div>
            {error && <ErrorNote message={error} />}
            <button type="submit" disabled={sending} className="btn btn-primary">
              {sending ? (
                <>
                  <Spinner /> Sending…
                </>
              ) : (
                "Send message"
              )}
            </button>
          </form>
        ) : selected ? (
          <>
            <div className="border-b border-line px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.subject}</h2>
                  <p className="mt-0.5 text-xs text-muted-2">Started {timeAgo(selected.createdAt)}</p>
                </div>
                <Badge tone={selected.status === "REPLIED" ? "green" : "amber"}>{selected.status}</Badge>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-6">
              <Bubble from="USER" body={selected.body} createdAt={selected.createdAt} />
              {selected.replies.map((r) => (
                <Bubble key={r.id} from={r.from} body={r.body} createdAt={r.createdAt} />
              ))}
            </div>

            <form onSubmit={sendReply} className="border-t border-line p-4">
              {notice && (
                <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                  {notice}
                </p>
              )}
              {error && <ErrorNote message={error} />}
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                  minLength={2}
                  className="input"
                  placeholder="Write a reply…"
                />
                <button type="submit" disabled={sending} className="btn btn-primary shrink-0">
                  {sending ? <Spinner /> : "Send"}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-2">
                Replies are emailed to the studio and answered by email.{" "}
                <Link href="/contact" className="link">
                  Prefer the public contact form?
                </Link>
              </p>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-10 text-center">
            <div>
              <p className="text-sm text-muted">Select a conversation to read and reply.</p>
              <button onClick={() => setComposing(true)} className="btn btn-ghost mt-4 text-xs">
                Start a new message
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ from, body, createdAt }: { from: "ADMIN" | "USER"; body: string; createdAt: string }) {
  const isUser = from === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl border px-4 py-3 ${
          isUser ? "border-brand/40 bg-brand/12 text-violet-50" : "border-line bg-ink-2 text-muted"
        }`}
      >
        <p className="whitespace-pre-line text-sm leading-relaxed">{body}</p>
        <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-2">
          {isUser ? "You" : "Studio"} · {timeAgo(createdAt)}
        </p>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
      {message}
    </p>
  );
}
