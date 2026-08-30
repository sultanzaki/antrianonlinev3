"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface ServiceOption {
  id: string;
  name: string;
  prefix: string;
}

interface IssuedTicket {
  number: string;
  serviceName: string;
  ahead: number;
}

const AUTO_RETURN_SECONDS = 15;

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

    let ahead = 0;
    try {
      const listRes = await fetch(`/api/tickets?serviceId=${service.id}&status=WAITING`);
      const listBody = await listRes.json();
      const position = listBody.tickets.findIndex(
        (t: { id: string }) => t.id === body.ticket.id,
      );
      ahead = position >= 0 ? position : 0;
    } catch {
      // Non-critical — the ticket was already issued successfully.
    }

    setIssued({ number: body.ticket.number, serviceName: service.name, ahead });
    setLoadingServiceId(null);
  }

  if (issued) {
    // Keyed on the ticket number so a new ticket always mounts a fresh
    // countdown instead of needing to reset state via an effect.
    return <IssuedTicketScreen key={issued.number} issued={issued} onDone={() => setIssued(null)} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-foreground">Pilih Layanan</h1>
        <p className="mt-1 text-muted">Sentuh salah satu layanan untuk mengambil nomor antrian</p>
      </div>

      {error && <p className="text-sm text-status-negative">{error}</p>}

      <div className="grid w-full max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => takeTicket(service)}
            disabled={loadingServiceId !== null}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-left shadow-sm transition hover:border-brand hover:shadow-md disabled:opacity-50"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-2xl font-bold text-brand">
              {service.prefix}
            </span>
            <span className="text-lg font-medium text-foreground">
              {loadingServiceId === service.id ? "Memproses..." : service.name}
            </span>
          </button>
        ))}
        {services.length === 0 && !error && (
          <p className="col-span-2 text-center text-sm text-muted">Memuat layanan...</p>
        )}
      </div>
    </div>
  );
}

function IssuedTicketScreen({ issued, onDone }: { issued: IssuedTicket; onDone: () => void }) {
  const [countdown, setCountdown] = useState(AUTO_RETURN_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? c : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0) onDone();
  }, [countdown, onDone]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <Card className="animate-pop-in flex w-full max-w-md flex-col items-center gap-4 px-8 py-12">
        <p className="text-lg text-muted">{issued.serviceName}</p>
        <p className="text-8xl font-bold tracking-tight text-brand">{issued.number}</p>
        {issued.ahead > 0 ? (
          <p className="text-foreground">
            <span className="font-semibold">{issued.ahead}</span> orang mengantre sebelum Anda
          </p>
        ) : (
          <p className="font-semibold text-status-serving">Giliran Anda selanjutnya!</p>
        )}
        <p className="text-sm text-muted">Silakan tunggu nomor Anda dipanggil di layar TV.</p>
        <Button size="lg" onClick={onDone} className="mt-2 w-full">
          Selesai ({countdown}s)
        </Button>
      </Card>
    </div>
  );
}
