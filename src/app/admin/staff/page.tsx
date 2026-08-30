"use client";

import { useEffect, useState } from "react";

interface Staff {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [newStaff, setNewStaff] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [busy, setBusy] = useState(false);

  async function fetchStaff(): Promise<Staff[]> {
    const res = await fetch("/api/admin/staff");
    const body = await res.json();
    return body.staff ?? [];
  }

  async function load() {
    setStaff(await fetchStaff());
  }

  useEffect(() => {
    let cancelled = false;
    fetchStaff().then((staff) => {
      if (!cancelled) setStaff(staff);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(id: string, data: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "Gagal menyimpan perubahan");
      return;
    }
    await load();
  }

  async function setPassword(id: string) {
    const password = passwordDrafts[id];
    if (!password || password.length < 8) {
      setError("Password minimal 8 karakter");
      return;
    }
    await patch(id, { password });
    setPasswordDrafts((d) => ({ ...d, [id]: "" }));
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Gagal menambah staff");
      return;
    }
    setNewStaff({ name: "", email: "", password: "", role: "STAFF" });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Staff</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4">
        {staff.map((s) => (
          <div key={s.id} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <input
                  defaultValue={s.name}
                  onBlur={(e) => e.target.value !== s.name && patch(s.id, { name: e.target.value })}
                  className="block bg-transparent font-medium text-zinc-900 dark:text-zinc-50"
                />
                <input
                  defaultValue={s.email}
                  onBlur={(e) => e.target.value !== s.email && patch(s.id, { email: e.target.value })}
                  className="block bg-transparent text-sm text-zinc-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={s.role}
                  onChange={(e) => patch(s.id, { role: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <span
                  className={
                    s.isActive
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }
                >
                  {s.isActive ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  onClick={() => patch(s.id, { isActive: !s.isActive })}
                  className="text-xs text-zinc-500 underline"
                >
                  {s.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="password"
                placeholder="Password baru (min. 8 karakter)"
                value={passwordDrafts[s.id] ?? ""}
                onChange={(e) => setPasswordDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                onClick={() => setPassword(s.id)}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:border-zinc-400 dark:border-zinc-700"
              >
                Set Password
              </button>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <p className="text-center text-sm text-zinc-500">Belum ada staff</p>
        )}
      </div>

      <form
        onSubmit={createStaff}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nama
          <input
            required
            value={newStaff.name}
            onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            required
            type="email"
            value={newStaff.email}
            onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            required
            type="password"
            minLength={8}
            value={newStaff.password}
            onChange={(e) => setNewStaff((s) => ({ ...s, password: e.target.value }))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select
            value={newStaff.role}
            onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value }))}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Tambah Staff
        </button>
      </form>
    </div>
  );
}
