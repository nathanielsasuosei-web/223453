"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/format";

interface AccountRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "ARTIST";
  createdAt: string;
  orders: number;
}

export function UserManager({
  users: initialUsers,
  currentUserId,
}: {
  users: AccountRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const producers = users.filter((u) => u.role === "ADMIN").length;
  const artists = users.length - producers;

  async function callApi(path: string, body?: unknown) {
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not update the account.");
      router.refresh();
      setNotice("Saved.");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function setRole(user: AccountRow, role: "ADMIN" | "ARTIST") {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    setBusyId(user.id);
    await callApi(`/api/admin/users/${user.id}/role`, { role });
    setBusyId(null);
  }

  async function remove(user: AccountRow) {
    const label = user.role === "ADMIN" ? "producer" : "artist";
    if (!window.confirm(`Delete ${user.name}'s ${label} account? This cannot be undone.`)) return;
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setBusyId(user.id);
    await callApi(`/api/admin/users/${user.id}/delete`);
    setBusyId(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white">Accounts</h2>
          <p className="mt-1 text-sm text-muted">
            Every account on the site — artists and producers. You control who can do what.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            {producers} producer{producers === 1 ? "" : "s"}
          </span>
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            {artists} artist{artists === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {notice && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
          {error}
        </p>
      )}

      <div className="card overflow-hidden">
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-muted-2">
                  <th className="px-5 py-3 font-semibold">Account</th>
                  <th className="px-5 py-3 font-semibold">Phone</th>
                  <th className="px-5 py-3 font-semibold">Role</th>
                  <th className="px-5 py-3 font-semibold">Orders</th>
                  <th className="px-5 py-3 font-semibold">Joined</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  const isProducer = user.role === "ADMIN";
                  return (
                    <tr key={user.id} className="transition-colors hover:bg-panel/40">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-ink ${
                              isProducer
                                ? "bg-gradient-to-br from-brand to-brand-2"
                                : "bg-gradient-to-br from-brand-3 to-brand"
                            }`}
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 font-semibold text-white">
                              <span className="truncate">{user.name}</span>
                              {isSelf && (
                                <span className="badge bg-brand/20 text-violet-300">You</span>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-2">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{user.phone || "—"}</td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`badge ${
                            isProducer ? "bg-violet-500/15 text-violet-300" : "bg-cyan-500/15 text-cyan-300"
                          }`}
                        >
                          {isProducer ? "Producer" : "Artist"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted">{user.orders}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-2">{timeAgo(user.createdAt)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setRole(user, isProducer ? "ARTIST" : "ADMIN")}
                            disabled={isSelf || busyId === user.id}
                            title={isSelf ? "You can't change your own role" : undefined}
                            className="btn btn-ghost px-3 py-1.5 text-xs"
                          >
                            {isProducer ? "Make artist" : "Make producer"}
                          </button>
                          <button
                            onClick={() => remove(user)}
                            disabled={isSelf || busyId === user.id}
                            title={isSelf ? "You can't delete your own account" : undefined}
                            className="btn btn-danger px-3 py-1.5 text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-10 text-center text-sm text-muted">No accounts yet.</p>
        )}
      </div>
    </div>
  );
}
