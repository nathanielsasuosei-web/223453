"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "./ui";
import { AudioBars } from "./AudioBars";

export function AuthForm({
  mode,
  next = "/account",
  serverError = "",
}: {
  mode: "login" | "signup";
  next?: string;
  serverError?: string;
}) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(serverError);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (isSignup) {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (form.password !== form.confirm) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignup
            ? { name: form.name, email: form.email, phone: form.phone, password: form.password }
            : { email: form.email, password: form.password },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      router.refresh();
      router.push(data.redirect ?? next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-7">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">
          {isSignup ? "Create your artist account" : "Welcome back"}
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          {isSignup
            ? "Free forever. It keeps your orders, invoices, downloads and messages in one place."
            : "Log in to see your orders, downloads and messages."}
        </p>
      </div>

      {isSignup && (
        <div>
          <label className="label" htmlFor="name">
            Artist / stage name
          </label>
          <input
            id="name"
            required
            minLength={2}
            autoComplete="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="e.g. Nova Kid"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="email">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          className="input"
          placeholder="you@email.com"
        />
      </div>

      {isSignup && (
        <div>
          <label className="label" htmlFor="phone">
            Mobile money number <span className="text-muted-2">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className="input"
            placeholder="+233 55 000 0000"
          />
        </div>
      )}

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={isSignup ? 8 : 6}
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          className="input"
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
        />
      </div>

      {isSignup && (
        <div>
          <label className="label" htmlFor="confirm">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => update("confirm", e.target.value)}
            className="input"
            placeholder="Repeat password"
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
        {loading ? (
          <>
            <Spinner /> {isSignup ? "Creating account…" : "Logging in…"}
          </>
        ) : isSignup ? (
          "Create account & start browsing"
        ) : (
          "Log in"
        )}
      </button>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Already have an account?" : "New to BeatForge?"}{" "}
        <Link href={isSignup ? `/login?next=${encodeURIComponent(next)}` : "/signup"} className="link font-semibold">
          {isSignup ? "Log in" : "Create a free account"}
        </Link>
      </p>
    </form>
  );
}

export function AuthAside() {
  return (
    <div className="mesh grain relative hidden overflow-hidden rounded-3xl border border-line p-8 lg:block">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 animate-blob bg-brand/30 blur-3xl" />
      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-[13px] font-black text-ink">
            BF
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">BeatForge</span>
        </div>

        <h2 className="mt-10 text-3xl font-black leading-tight tracking-tight text-white">
          Your account is your{" "}
          <span className="text-gradient">vault</span>.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Every order, invoice, download link and message with the studio lives here — plus your beats
          arrive by email the moment payment clears.
        </p>

        <ul className="mt-8 space-y-4">
          {[
            { title: "Preview everything", body: "Full waveform previews before you spend a cedi." },
            { title: "Pay how you already pay", body: "Mobile money or bank transfer, with your order reference." },
            { title: "Files in your inbox", body: "Instant email delivery plus permanent private links." },
            { title: "Direct line to the producer", body: "Messages answered by email, same business day." },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-violet-200">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs leading-relaxed text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line-2 bg-ink/40 p-4 backdrop-blur">
          <AudioBars playing className="h-8" bars={7} />
          <p className="text-xs text-muted">
            <span className="font-bold text-white">24/7 delivery.</span> Confirmations run around the
            clock — even at 3am.
          </p>
        </div>
      </div>
    </div>
  );
}
