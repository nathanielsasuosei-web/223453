"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { Spinner } from "./ui";

export interface PickerLicense {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  includes: string[];
  exclusive: boolean;
}

export function LicensePicker({
  beatId,
  slug,
  licenses,
  currency = "USD",
  currencySymbol = "$",
}: {
  beatId: string;
  slug: string;
  licenses: PickerLicense[];
  currency?: string;
  currencySymbol?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(licenses[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const license = licenses.find((l) => l.id === selected) ?? licenses[0];

  async function checkout() {
    if (!license) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beatId, licenseId: license.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.push(`/login?next=/beats/${slug}`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout. Please try again.");
      router.push(`/checkout/${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (!licenses.length) {
    return <p className="text-sm text-muted-2">Licensing is being updated — check back shortly.</p>;
  }

  return (
    <div>
      <fieldset className="space-y-2.5">
        <legend className="label">Choose your license</legend>
        {licenses.map((option) => {
          const active = option.id === selected;
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-all ${
                active
                  ? "border-brand bg-brand/10 shadow-lg shadow-brand/10"
                  : "border-line bg-ink-2 hover:border-line-2"
              }`}
            >
              <input
                type="radio"
                name="license"
                value={option.id}
                checked={active}
                onChange={() => setSelected(option.id)}
                className="mt-1 h-4 w-4 accent-violet-500"
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{option.name}</span>
                  <span className="text-sm font-extrabold text-violet-300">
                    {formatMoney(option.priceCents, currency, currencySymbol)}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted">{option.description}</span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {option.includes.map((item) => (
                    <span key={item} className="chip !py-0.5 !text-[10px]">
                      {item}
                    </span>
                  ))}
                </span>
                {option.exclusive && (
                  <span className="mt-2 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Beat removed from store
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </fieldset>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-5 rounded-xl border border-line bg-ink-2 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-2">Total due</p>
            <p className="text-2xl font-black tracking-tight text-white">
              {license ? formatMoney(license.priceCents, currency, currencySymbol) : "—"}
            </p>
          </div>
          <p className="text-right text-[11px] text-muted-2">
            {license?.name}
            <br />
            one-time payment
          </p>
        </div>
        <button onClick={checkout} disabled={loading || !license} className="btn btn-primary mt-4 w-full py-3">
          {loading ? (
            <>
              <Spinner /> Starting checkout…
            </>
          ) : (
            <>
              Buy now &amp; pay by mobile money
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </>
          )}
        </button>
        <p className="mt-2.5 text-center text-[11px] text-muted-2">
          Mobile money &amp; bank transfer · files emailed on confirmation
        </p>
      </div>
    </div>
  );
}
