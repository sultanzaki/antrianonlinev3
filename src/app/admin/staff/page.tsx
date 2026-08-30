"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";

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
      <h1 className="text-xl font-semibold text-foreground">Staff</h1>

      {error && <p className="text-sm text-status-negative">{error}</p>}

      <div className="flex flex-col gap-4">
        {staff.map((s) => (
          <div key={s.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <input
                  defaultValue={s.name}
                  onBlur={(e) => e.target.value !== s.name && patch(s.id, { name: e.target.value })}
                  className="block bg-transparent font-medium text-foreground"
                />
                <input
                  defaultValue={s.email}
                  onBlur={(e) => e.target.value !== s.email && patch(s.id, { email: e.target.value })}
                  className="block bg-transparent text-sm text-muted"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={s.role}
                  onChange={(e) => patch(s.id, { role: e.target.value })}
                  className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <Pill tone={s.isActive ? "positive" : "neutral"}>
                  {s.isActive ? "Aktif" : "Nonaktif"}
                </Pill>
                <button
                  onClick={() => patch(s.id, { isActive: !s.isActive })}
                  className="text-xs text-muted underline"
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
                className="rounded-md border border-border bg-transparent px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => setPassword(s.id)}
                className="rounded-md border border-border px-3 py-1.5 text-sm hover:border-brand"
              >
                Set Password
              </button>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <p className="text-center text-sm text-muted">Belum ada staff</p>
        )}
      </div>

      <form
        onSubmit={createStaff}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nama
          <input
            required
            value={newStaff.name}
            onChange={(e) => setNewStaff((s) => ({ ...s, name: e.target.value }))}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            required
            type="email"
            value={newStaff.email}
            onChange={(e) => setNewStaff((s) => ({ ...s, email: e.target.value }))}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
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
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Role
          <select
            value={newStaff.role}
            onChange={(e) => setNewStaff((s) => ({ ...s, role: e.target.value }))}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm"
          >
            <option value="STAFF">STAFF</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </label>
        <Button type="submit" disabled={busy}>
          Tambah Staff
        </Button>
      </form>
    </div>
  );
}
