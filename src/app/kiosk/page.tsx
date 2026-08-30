"use client";

import { useEffect, useState } from "react";

interface ServiceOption {
  id: string;
  name: string;
  prefix: string;
}

interface IssuedTicket {
  number: string;
  serviceName: string;
}

export default function KioskPage() {
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [issued, setIssued] = useState<IssuedTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingServiceId, setLoadingServiceId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => setServices(data.services ?? []))
      .catch(() => setError("Gagal memuat daftar layanan"));
  }, []);

  async function takeTicket(service: ServiceOption) {
    setLoadingServiceId(service.id);
    setError(null);

    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: service.id }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? "Gagal mengambil nomor antrian");
      setLoadingServiceId(null);
      return;
    }

    setIssued({ number: body.ticket.number, serviceName: service.name });
    setLoadingServiceId(null);
  }

  if (issued) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-4 text-center dark:bg-black">
        <p className="text-lg text-zinc-600 dark:text-zinc-400">{issued.serviceName}</p>
        <p className="text-8xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {issued.number}
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          Silakan tunggu nomor Anda dipanggil di layar TV.
        </p>
        <button
          onClick={() => setIssued(null)}
          className="mt-4 rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Selesai
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-zinc-50 px-4 dark:bg-black">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Pilih Layanan
      </h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid w-full max-w-md grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => takeTicket(service)}
            disabled={loadingServiceId !== null}
            className="rounded-xl border border-zinc-200 bg-white px-6 py-8 text-lg font-medium text-zinc-900 transition-colors hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:border-zinc-600"
          >
            {loadingServiceId === service.id ? "Memproses..." : service.name}
          </button>
        ))}
        {services.length === 0 && !error && (
          <p className="col-span-2 text-center text-sm text-zinc-500">Memuat layanan...</p>
        )}
      </div>
    </div>
  );
}
