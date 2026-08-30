"use client";

import { useEffect, useState } from "react";

interface Service {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrefix, setNewPrefix] = useState("");
  const [busy, setBusy] = useState(false);

  async function fetchServices(): Promise<Service[]> {
    const res = await fetch("/api/admin/services");
    const body = await res.json();
    return body.services ?? [];
  }

  useEffect(() => {
    let cancelled = false;
    fetchServices().then((services) => {
      if (!cancelled) setServices(services);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function createService(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, prefix: newPrefix }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error?.formErrors?.[0] ?? body?.error ?? "Gagal menambah layanan");
      return;
    }
    setNewName("");
    setNewPrefix("");
    setServices(await fetchServices());
  }

  async function update(id: string, data: Partial<Pick<Service, "name" | "prefix" | "isActive">>) {
    setError(null);
    const res = await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      setError(body?.error ?? "Gagal menyimpan perubahan");
      return;
    }
    setServices(await fetchServices());
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Layanan</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-left text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Prefix</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-2">
                  <input
                    defaultValue={service.name}
                    onBlur={(e) =>
                      e.target.value !== service.name && update(service.id, { name: e.target.value })
                    }
                    className="w-full bg-transparent"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    defaultValue={service.prefix}
                    onBlur={(e) =>
                      e.target.value !== service.prefix &&
                      update(service.id, { prefix: e.target.value })
                    }
                    className="w-16 bg-transparent"
                  />
                </td>
                <td className="px-4 py-2">
                  <span
                    className={
                      service.isActive
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }
                  >
                    {service.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => update(service.id, { isActive: !service.isActive })}
                    className="text-xs text-zinc-500 underline"
                  >
                    {service.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Belum ada layanan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={createService}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <label className="flex flex-col gap-1 text-sm">
          Nama layanan
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="Pendaftaran"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prefix
          <input
            required
            maxLength={4}
            value={newPrefix}
            onChange={(e) => setNewPrefix(e.target.value)}
            className="w-24 rounded-md border border-zinc-300 px-3 py-2 text-sm uppercase dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="A"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Tambah Layanan
        </button>
      </form>
    </div>
  );
}
