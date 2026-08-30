"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Badge";

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
      <h1 className="text-xl font-semibold text-foreground">Layanan</h1>

      {error && <p className="text-sm text-status-negative">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-brand-muted text-left text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Prefix</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-t border-border">
                <td className="px-4 py-2">
                  <input
                    defaultValue={service.name}
                    onBlur={(e) =>
                      e.target.value !== service.name && update(service.id, { name: e.target.value })
                    }
                    className="w-full bg-transparent text-foreground"
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    defaultValue={service.prefix}
                    onBlur={(e) =>
                      e.target.value !== service.prefix &&
                      update(service.id, { prefix: e.target.value })
                    }
                    className="w-16 bg-transparent text-foreground"
                  />
                </td>
                <td className="px-4 py-2">
                  <Pill tone={service.isActive ? "positive" : "neutral"}>
                    {service.isActive ? "Aktif" : "Nonaktif"}
                  </Pill>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => update(service.id, { isActive: !service.isActive })}
                    className="text-xs text-muted underline underline-offset-4"
                  >
                    {service.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  Belum ada layanan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={createService}
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-border p-4"
      >
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Nama layanan
          <input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
            placeholder="Pendaftaran"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-foreground">
          Prefix
          <input
            required
            maxLength={4}
            value={newPrefix}
            onChange={(e) => setNewPrefix(e.target.value)}
            className="w-24 rounded-lg border border-border bg-transparent px-3 py-2 text-sm uppercase"
            placeholder="A"
          />
        </label>
        <Button type="submit" disabled={busy}>
          Tambah Layanan
        </Button>
      </form>
    </div>
  );
}
