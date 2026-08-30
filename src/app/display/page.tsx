"use client";

import { useCallback, useEffect, useState } from "react";
import { usePolling } from "@/lib/hooks/use-polling";
import { useQueueEvents } from "@/lib/pusher/use-queue-events";

interface TicketDTO {
  id: string;
  number: string;
  status: "WAITING" | "CALLED" | "SERVING" | "DONE";
  calledAt: string | null;
  counterId: string | null;
  service: { name: string };
  counter: { name: string } | null;
}

interface NowServing {
  counterId: string;
  counterName: string;
  number: string;
  serviceName: string;
}

interface RecentCall {
  id: string;
  number: string;
  counterName: string;
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function DisplayPage() {
  const [nowServing, setNowServing] = useState<NowServing[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [waitingCounts, setWaitingCounts] = useState<Record<string, number>>({});
  const [justCalled, setJustCalled] = useState<Set<string>>(new Set());
  const clock = useClock();

  const refresh = useCallback(async () => {
    const [activeRes, recentRes, waitingRes] = await Promise.all([
      fetch("/api/tickets?status=CALLED,SERVING"),
      fetch("/api/tickets?status=CALLED,SERVING,DONE"),
      fetch("/api/tickets?status=WAITING"),
    ]);
    const active: { tickets: TicketDTO[] } = await activeRes.json();
    const recent: { tickets: TicketDTO[] } = await recentRes.json();
    const waiting: { tickets: TicketDTO[] } = await waitingRes.json();

    setNowServing(
      active.tickets
        .filter((t) => t.counter && t.counterId)
        .map((t) => ({
          counterId: t.counterId!,
          counterName: t.counter!.name,
          number: t.number,
          serviceName: t.service.name,
        })),
    );

    setRecentCalls(
      recent.tickets
        .filter((t) => t.calledAt && t.counter)
        .sort((a, b) => new Date(b.calledAt!).getTime() - new Date(a.calledAt!).getTime())
        .slice(0, 6)
        .map((t) => ({ id: t.id, number: t.number, counterName: t.counter!.name })),
    );

    const counts: Record<string, number> = {};
    for (const t of waiting.tickets) {
      counts[t.service.name] = (counts[t.service.name] ?? 0) + 1;
    }
    setWaitingCounts(counts);
  }, []);

  usePolling(refresh, 10_000);
  useQueueEvents((payload) => {
    if (payload.type === "ticket.called" && payload.ticket.counterId) {
      const counterId = payload.ticket.counterId;
      setJustCalled((prev) => new Set(prev).add(counterId));
      setTimeout(() => {
        setJustCalled((prev) => {
          const next = new Set(prev);
          next.delete(counterId);
          return next;
        });
      }, 3000);
    }
    refresh();
  });

  return (
    <div className="min-h-screen bg-[#05070d] px-8 py-8 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-wide text-white/90">Antrian Online</h1>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            {clock.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-white/50">
            {clock.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      <h2 className="mt-10 text-center text-lg font-medium uppercase tracking-widest text-white/50">
        Sedang Dipanggil
      </h2>

      <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nowServing.length === 0 && (
          <p className="col-span-full text-center text-white/40">
            Belum ada nomor yang dipanggil.
          </p>
        )}
        {nowServing.map((item) => (
          <div
            key={item.counterId}
            className={`rounded-2xl border border-white/10 bg-white/5 p-8 text-center transition ${
              justCalled.has(item.counterId) ? "animate-flash-highlight" : ""
            }`}
          >
            <p className="text-lg text-white/60">{item.counterName}</p>
            <p className="mt-2 text-7xl font-bold tabular-nums">{item.number}</p>
            <p className="mt-2 text-white/60">{item.serviceName}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-white/50">
            Baru Saja Dipanggil
          </h2>
          <ul className="mt-4 divide-y divide-white/10">
            {recentCalls.map((call) => (
              <li key={call.id} className="flex justify-between py-2.5 text-white/80">
                <span className="font-medium tabular-nums">{call.number}</span>
                <span className="text-white/50">{call.counterName}</span>
              </li>
            ))}
            {recentCalls.length === 0 && (
              <li className="py-2.5 text-center text-white/30">Belum ada riwayat</li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-medium uppercase tracking-widest text-white/50">
            Menunggu
          </h2>
          <ul className="mt-4 divide-y divide-white/10">
            {Object.entries(waitingCounts).map(([service, count]) => (
              <li key={service} className="flex justify-between py-2.5 text-white/80">
                <span>{service}</span>
                <span className="font-medium tabular-nums">{count}</span>
              </li>
            ))}
            {Object.keys(waitingCounts).length === 0 && (
              <li className="py-2.5 text-center text-white/30">Tidak ada antrian menunggu</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
