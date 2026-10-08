"use client";

import { useState } from "react";
import Link from "next/link";
import { Spinner } from "./ui";

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
  loggedIn = false,
}: {
  defaultName?: string;
  defaultEmail?: string;
  loggedIn?: boolean;
}) {
  const [form, setForm] = useState({
    name: defaultName,
    email: defaultEmail,
    subject: "",
    message: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send your message.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-300">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <h2 className="text-xl font-bold text-white">Message sent ✉️</h2>
        <p className="max-w-sm text-sm text-muted">
          The producer has been emailed your message and will reply to{" "}
          <strong className="text-white">{form.email}</strong>. You can follow the thread in your
          account.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/beats" className="btn btn-primary text-xs">
            Browse beats
          </Link>
          {loggedIn && (
            <Link href="/account?tab=messages" className="btn btn-ghost text-xs">
              View my messages
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">
            Your name
          </label>
          <input
            id="name"
            required
            minLength={2}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="Artist name"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email (replies go here)
          </label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input"
            placeholder="you@email.com"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="subject">
          Subject
        </label>
        <input
          id="subject"
          required
          minLength={3}
          value={form.subject}
          onChange={(e) => update("subject", e.target.value)}
          className="input"
          placeholder="Custom beat, licensing question, collab…"
        />
      </div>
      <div>
        <label className="label" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          required
          minLength={10}
          rows={6}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="input resize-y"
          placeholder="Tell the studio what you need…"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={state === "sending"} className="btn btn-primary w-full py-3">
        {state === "sending" ? (
          <>
            <Spinner /> Sending…
          </>
        ) : (
          <>
            Send message
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m22 2-7 20-4-9-9-4z" />
            </svg>
          </>
        )}
      </button>
      <p className="text-center text-[11px] text-muted-2">
        By sending a message you agree to be contacted about your enquiry. No spam, ever.
      </p>
    </form>
  );
}
