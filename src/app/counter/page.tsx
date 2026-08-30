"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePolling } from "@/lib/hooks/use-polling";
import { useQueueEvents } from "@/lib/pusher/use-queue-events";
import { STATUS_LABELS } from "@/lib/tickets/labels";

interface Session {
  staffId: string;
  name: string;
  role: string;
  counterId?: string;
  counterName?: string | null;
}

interface CounterOption {
  id: string;
  name: string;
  services: { id: string; name: string }[];
}

interface CurrentTicket {
  id: string;
  number: string;
  status: "CALLED" | "SERVING";
  service: { name: string };
}

export default function CounterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [current, setCurrent] = useState<CurrentTicket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me").then(async (res) => {
      if (cancelled) return;
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const body = await res.json();
      if (!cancelled) setSession(body.session);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (session && !session.counterId) {
      fetch("/api/counters")
        .then((res) => res.json())
        .then((body) => setCounters(body.counters ?? []));
    }
  }, [session]);

  const refreshCurrent = useCallback(async () => {
    if (!session?.counterId) return;
    const res = await fetch("/api/tickets/current");
    if (!res.ok) return;
    const body = await res.json();
    setCurrent(body.ticket);
  }, [session?.counterId]);

  usePolling(refreshCurrent, 5_000);
  useQueueEvents(() => refreshCurrent());

  async function selectCounter(counter: CounterOption) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/select-counter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ counterId: counter.id }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Gagal memilih loket");
      return;
    }
    setSession((s) => (s ? { ...s, counterId: counter.id, counterName: counter.name } : s));
  }

  async function callNext() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/tickets/call-next", { method: "POST" });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Gagal memanggil nomor berikutnya");
      return;
    }
    await refreshCurrent();
  }

  async function transition(toStatus: "SERVING" | "SKIPPED" | "NO_SHOW" | "DONE") {
    if (!current) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tickets/${current.id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus }),
    });
    const body = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(body?.error ?? "Gagal memperbarui status tiket");
      return;
    }
    await refreshCurrent();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center">Memuat...</div>;
  }

  if (!session.counterId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-4 dark:bg-black">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          Pilih Loket, {session.name}
        </h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid w-full max-w-sm grid-cols-1 gap-3">
          {counters.map((counter) => (
            <button
              key={counter.id}
              disabled={busy}
              onClick={() => selectCounter(counter)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              {counter.name}
              <span className="block text-xs font-normal text-zinc-500">
                {counter.services.map((s) => s.name).join(", ") || "Tidak ada layanan"}
              </span>
            </button>
          ))}
          {counters.length === 0 && (
            <p className="text-center text-sm text-zinc-500">Memuat loket...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{session.name}</p>
            <p className="text-sm text-zinc-500">{session.counterName ?? "Loket"}</p>
          </div>
          <div className="flex items-center gap-4">
            {session.role === "ADMIN" && (
              <Link href="/admin" className="text-sm text-zinc-500 underline">
                Admin
              </Link>
            )}
            <button onClick={logout} className="text-sm text-zinc-500 underline">
              Logout
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          {!current && (
            <>
              <p className="text-zinc-500">Tidak ada tiket aktif</p>
              <button
                onClick={callNext}
                disabled={busy}
                className="mt-6 w-full rounded-md bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
              >
                Panggil Berikutnya
              </button>
            </>
          )}

          {current && (
            <>
              <p className="text-sm text-zinc-500">{current.service.name}</p>
              <p className="mt-2 text-6xl font-bold text-zinc-900 dark:text-zinc-50">
                {current.number}
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                Status: {STATUS_LABELS[current.status]}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2">
                {current.status === "CALLED" && (
                  <>
                    <button
                      onClick={() => transition("SERVING")}
                      disabled={busy}
                      className="rounded-md bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                    >
                      Mulai Layani
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => transition("SKIPPED")}
                        disabled={busy}
                        className="rounded-md border border-zinc-300 py-2 text-sm text-zinc-700 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        Lewati
                      </button>
                      <button
                        onClick={() => transition("NO_SHOW")}
                        disabled={busy}
                        className="rounded-md border border-zinc-300 py-2 text-sm text-zinc-700 hover:border-zinc-400 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
                      >
                        Tidak Hadir
                      </button>
                    </div>
                  </>
                )}

                {current.status === "SERVING" && (
                  <button
                    onClick={() => transition("DONE")}
                    disabled={busy}
                    className="rounded-md bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                  >
                    Selesai
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
