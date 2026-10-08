"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "../ui";

interface MomoAccount {
  provider: string;
  number: string;
  name: string;
}

interface BankAccount {
  bankName: string;
  accountName: string;
  accountNumber: string;
  swift: string;
  branch: string;
}

interface Socials {
  instagram: string;
  youtube: string;
  tiktok: string;
  spotify: string;
  x: string;
}

export function SettingsForm({
  settings,
  currencies,
}: {
  settings: {
    producerName: string;
    producerTagline: string;
    producerBio: string;
    contactEmail: string;
    contactPhone: string;
    whatsapp: string;
    location: string;
    currency: string;
    currencySymbol: string;
    momoAccounts: MomoAccount[];
    bankAccount: BankAccount;
    paymentInstructions: string;
    deliveryNote: string;
    socials: Socials;
  };
  currencies: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateMomo(index: number, patch: Partial<MomoAccount>) {
    update(
      "momoAccounts",
      form.momoAccounts.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not save settings.");
      setNotice("Settings saved — the storefront now shows the new details.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Studio settings</h2>
        <p className="mt-1 text-xs text-muted">
          Everything the storefront shows: who the producer is, how artists pay and how files are
          delivered.
        </p>
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

      {/* ------------------------------------------------------------- studio */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Producer & studio</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="s-name">
              Producer / brand name
            </label>
            <input
              id="s-name"
              value={form.producerName}
              onChange={(e) => update("producerName", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="s-location">
              Location
            </label>
            <input
              id="s-location"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="s-tagline">
              Tagline
            </label>
            <input
              id="s-tagline"
              value={form.producerTagline}
              onChange={(e) => update("producerTagline", e.target.value)}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="s-bio">
              Bio (footer & about)
            </label>
            <textarea
              id="s-bio"
              rows={3}
              value={form.producerBio}
              onChange={(e) => update("producerBio", e.target.value)}
              className="input resize-y"
            />
          </div>
          <div>
            <label className="label" htmlFor="s-email">
              Contact email (order alerts go here)
            </label>
            <input
              id="s-email"
              type="email"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="s-phone">
              Phone / WhatsApp
            </label>
            <input
              id="s-phone"
              value={form.contactPhone}
              onChange={(e) => update("contactPhone", e.target.value)}
              className="input"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ payment */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">
          Mobile money lines
        </h3>
        <div className="space-y-3">
          {form.momoAccounts.map((account, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-line bg-ink-2 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <label className="label" htmlFor={`momo-provider-${index}`}>
                  Provider
                </label>
                <input
                  id={`momo-provider-${index}`}
                  value={account.provider}
                  onChange={(e) => updateMomo(index, { provider: e.target.value })}
                  className="input"
                  placeholder="MTN Mobile Money"
                />
              </div>
              <div>
                <label className="label" htmlFor={`momo-number-${index}`}>
                  Number
                </label>
                <input
                  id={`momo-number-${index}`}
                  value={account.number}
                  onChange={(e) => updateMomo(index, { number: e.target.value })}
                  className="input"
                  placeholder="+233 55 000 0000"
                />
              </div>
              <div>
                <label className="label" htmlFor={`momo-name-${index}`}>
                  Account name
                </label>
                <input
                  id={`momo-name-${index}`}
                  value={account.name}
                  onChange={(e) => updateMomo(index, { name: e.target.value })}
                  className="input"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => update("momoAccounts", form.momoAccounts.filter((_, i) => i !== index))}
                  className="btn btn-danger !px-3 !py-2 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() =>
            update("momoAccounts", [...form.momoAccounts, { provider: "", number: "", name: "BeatForge Studio" }])
          }
          className="btn btn-ghost text-xs"
        >
          + Add mobile money line
        </button>
      </section>

      {/* --------------------------------------------------------------- bank */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Bank account</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="b-name">
              Bank name
            </label>
            <input
              id="b-name"
              value={form.bankAccount.bankName}
              onChange={(e) => update("bankAccount", { ...form.bankAccount, bankName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-account">
              Account name
            </label>
            <input
              id="b-account"
              value={form.bankAccount.accountName}
              onChange={(e) => update("bankAccount", { ...form.bankAccount, accountName: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-number">
              Account number
            </label>
            <input
              id="b-number"
              value={form.bankAccount.accountNumber}
              onChange={(e) => update("bankAccount", { ...form.bankAccount, accountNumber: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-swift">
              SWIFT / routing
            </label>
            <input
              id="b-swift"
              value={form.bankAccount.swift}
              onChange={(e) => update("bankAccount", { ...form.bankAccount, swift: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="b-branch">
              Branch
            </label>
            <input
              id="b-branch"
              value={form.bankAccount.branch}
              onChange={(e) => update("bankAccount", { ...form.bankAccount, branch: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ currency */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Currency</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="c-code">
              Currency code
            </label>
            <select
              id="c-code"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              className="input"
            >
              {[...new Set([...currencies, form.currency])].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="c-symbol">
              Symbol
            </label>
            <input
              id="c-symbol"
              value={form.currencySymbol}
              onChange={(e) => update("currencySymbol", e.target.value)}
              className="input"
            />
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- notes */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">
          Checkout messages
        </h3>
        <div>
          <label className="label" htmlFor="s-instructions">
            Payment instructions (shown on checkout & emailed)
          </label>
          <textarea
            id="s-instructions"
            rows={3}
            value={form.paymentInstructions}
            onChange={(e) => update("paymentInstructions", e.target.value)}
            className="input resize-y"
          />
        </div>
        <div>
          <label className="label" htmlFor="s-delivery">
            Delivery note (emailed with the files)
          </label>
          <textarea
            id="s-delivery"
            rows={3}
            value={form.deliveryNote}
            onChange={(e) => update("deliveryNote", e.target.value)}
            className="input resize-y"
          />
        </div>
      </section>

      {/* ------------------------------------------------------------- socials */}
      <section className="card space-y-4 p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-2">Social links</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["instagram", "Instagram"],
              ["youtube", "YouTube"],
              ["tiktok", "TikTok"],
              ["spotify", "Spotify"],
              ["x", "X / Twitter"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="label" htmlFor={`social-${key}`}>
                {label}
              </label>
              <input
                id={`social-${key}`}
                value={form.socials[key]}
                onChange={(e) => update("socials", { ...form.socials, [key]: e.target.value })}
                className="input"
                placeholder="https://"
              />
            </div>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-wrap gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? (
            <>
              <Spinner /> Saving…
            </>
          ) : (
            "Save settings"
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setForm(settings);
            setNotice("");
            setError("");
          }}
          className="btn btn-ghost"
        >
          Reset changes
        </button>
      </div>
    </form>
  );
}
