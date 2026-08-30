"use client";

import { useEffect, useState } from "react";

interface ServiceOption {
  id: string;
  name: string;
}

interface Counter {
  id: string;
  name: string;
  isActive: boolean;
  services: ServiceOption[];
}

export default function AdminCountersPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newServiceIds, setNewServiceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function fetchData(): Promise<{ counters: Counter[]; services: ServiceOption[] }> {
    const [countersRes, servicesRes] = await Promise.all([
      fetch("/api/admin/counters"),
      fetch("/api/admin/services"),
    ]);
    const countersBody = await countersRes.json();
    const servicesBody = await servicesRes.json();
    return { counters: countersBody.counters ?? [], services: servicesBody.services ?? [] };
  }

  async function load() {
    const data = await fetchData();
    setCounters(data.counters);
    setServices(data.services);
  }

  useEffect(() => {
    let cancelled = false;
    fetchData().then((data) => {
      if (!cancelled) {
        setCounters(data.counters);
        setServices(data.services);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function patch(id: string, data: Record<string, unknown>) {
    setError(null);
    const res = await fetch(`/api/admin/counters/${id}`, {
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

  function toggleCounterService(counter: Counter, serviceId: string) {
    const has = counter.services.some((s) => s.id === serviceId);
    const nextIds = has
      ? counter.services.filter((s) => s.id !== serviceId).map((s) => s.id)
      : [...counter.services.map((s) => s.id), serviceId];
    patch(counter.id, { serviceIds: nextIds });
  }

  async function createCounter(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/counters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, serviceIds: newServiceIds }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Gagal menambah loket");
      return;
    }
    setNewName("");
    setNewServiceIds([]);
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Loket</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-4">
        {counters.map((counter) => (
          <div
            key={counter.id}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <input
                defaultValue={counter.name}
                onBlur={(e) =>
                  e.target.value !== counter.name && patch(counter.id, { name: e.target.value })
                }
                className="bg-transparent font-medium text-zinc-900 dark:text-zinc-50"
              />
              <div className="flex items-center gap-3">
                <span
                  className={
                    counter.isActive
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }
                >
                  {counter.isActive ? "Aktif" : "Nonaktif"}
                </span>
                <button
                  onClick={() => patch(counter.id, { isActive: !counter.isActive })}
                  className="text-xs text-zinc-500 underline"
                >
                  {counter.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {services.map((service) => {
                const checked = counter.services.some((s) => s.id === service.id);
                return (
                  <label key={service.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCounterService(counter, service.id)}
                    />
                    {service.name}
                  </label>
                );
              })}
              {services.length === 0 && (
                <span className="text-sm text-zinc-500">Belum ada layanan</span>
              )}
            </div>
          </div>
        ))}
        {counters.length === 0 && (
          <p className="text-center text-sm text-zinc-500">Belum ada loket</p>
        )}
      </div>

      <form
        onSubmit={createCounter}
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nama loket
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Loket 3"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          {services.map((service) => (
            <label key={service.id} className="flex items-center gap-1.5 text-sm">
              <input
                type="checkbox"
                checked={newServiceIds.includes(service.id)}
                onChange={(e) =>
                  setNewServiceIds((ids) =>
                    e.target.checked ? [...ids, service.id] : ids.filter((i) => i !== service.id),
                  )
                }
              />
              {service.name}
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Tambah Loket
        </button>
      </form>
    </div>
  );
}
