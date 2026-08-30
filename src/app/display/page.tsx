"use client";

import { useCallback, useState } from "react";
import { usePolling } from "@/lib/hooks/use-polling";
import { useQueueEvents } from "@/lib/pusher/use-queue-events";

interface TicketDTO {
  id: string;
  number: string;
  status: "WAITING" | "CALLED" | "SERVING";
  service: { name: string };
  counter: { name: string } | null;
}

interface NowServing {
  counterName: string;
  number: string;
  serviceName: string;
}

export default function DisplayPage() {
  const [nowServing, setNowServing] = useState<NowServing[]>([]);
  const [waitingCounts, setWaitingCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    const [activeRes, waitingRes] = await Promise.all([
      fetch("/api/tickets?status=CALLED,SERVING"),
      fetch("/api/tickets?status=WAITING"),
    ]);
    const active: { tickets: TicketDTO[] } = await activeRes.json();
    const waiting: { tickets: TicketDTO[] } = await waitingRes.json();

    setNowServing(
      active.tickets
        .filter((t) => t.counter)
        .map((t) => ({
          counterName: t.counter!.name,
          number: t.number,
          serviceName: t.service.name,
        })),
    );

    const counts: Record<string, number> = {};
    for (const t of waiting.tickets) {
      counts[t.service.name] = (counts[t.service.name] ?? 0) + 1;
    }
    setWaitingCounts(counts);
  }, []);

  usePolling(refresh, 10_000);
  useQueueEvents(() => refresh());

  return (
    <div className="min-h-screen bg-black px-8 py-10 text-white">
      <h1 className="text-center text-3xl font-semibold tracking-wide">
        SEDANG DIPANGGIL
      </h1>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {nowServing.length === 0 && (
          <p className="col-span-full text-center text-zinc-500">
            Belum ada nomor yang dipanggil.
          </p>
        )}
        {nowServing.map((item) => (
          <div
            key={item.counterName}
            className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center"
          >
            <p className="text-lg text-zinc-400">{item.counterName}</p>
            <p className="mt-2 text-6xl font-bold">{item.number}</p>
            <p className="mt-2 text-zinc-400">{item.serviceName}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-lg">
        <h2 className="text-center text-lg text-zinc-400">Menunggu</h2>
        <ul className="mt-4 divide-y divide-zinc-800">
          {Object.entries(waitingCounts).map(([service, count]) => (
            <li key={service} className="flex justify-between py-2 text-zinc-300">
              <span>{service}</span>
              <span>{count}</span>
            </li>
          ))}
          {Object.keys(waitingCounts).length === 0 && (
            <li className="py-2 text-center text-zinc-600">Tidak ada antrian menunggu</li>
          )}
        </ul>
      </div>
    </div>
  );
}
