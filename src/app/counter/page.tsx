"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePolling } from "@/lib/hooks/use-polling";
import { useQueueEvents } from "@/lib/pusher/use-queue-events";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

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
  createdAt: string;
  calledAt: string;
  service: { name: string };
}

function elapsedLabel(since: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} detik`;
  return `${minutes} menit ${seconds % 60} detik`;
}

export default function CounterPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [current, setCurrent] = useState<CurrentTicket | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  // Not gated on session.counterId: the server derives the counter from the
  // cookie, so this is safe to call right after select-counter succeeds too
  // (before this component's own session state has re-rendered).
  const refreshCurrent = useCallback(async () => {
    const res = await fetch("/api/tickets/current");
    if (!res.ok) return;
    const body = await res.json();
    setCurrent(body.ticket);
    setWaitingCount(body.waitingCount ?? 0);
  }, []);

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
    await refreshCurrent();
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted">
        Memuat...
      </div>
    );
  }

  if (!session.counterId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4">
        <h1 className="text-xl font-semibold text-foreground">Pilih Loket, {session.name}</h1>
        {error && <p className="text-sm text-status-negative">{error}</p>}
        <div className="grid w-full max-w-sm grid-cols-1 gap-3">
          {counters.map((counter) => (
            <button
              key={counter.id}
              disabled={busy}
              onClick={() => selectCounter(counter)}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-brand disabled:opacity-50"
            >
              {counter.name}
              <span className="block text-xs font-normal text-muted">
                {counter.services.map((s) => s.name).join(", ") || "Tidak ada layanan"}
              </span>
            </button>
          ))}
          {counters.length === 0 && (
            <p className="text-center text-sm text-muted">Memuat loket...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{session.name}</p>
            <p className="text-sm text-muted">{session.counterName ?? "Loket"}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted">
              Menunggu: <span className="font-semibold text-foreground">{waitingCount}</span>
            </span>
            {session.role === "ADMIN" && (
              <Link href="/admin" className="text-sm text-muted underline underline-offset-4">
                Admin
              </Link>
            )}
            <button onClick={logout} className="text-sm text-muted underline underline-offset-4">
              Logout
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-status-negative">{error}</p>}

        <Card className="p-8 text-center">
          {!current && (
            <>
              <p className="text-muted">Tidak ada tiket aktif</p>
              {waitingCount === 0 && (
                <p className="mt-1 text-xs text-muted">Belum ada pelanggan menunggu</p>
              )}
              <Button size="lg" onClick={callNext} disabled={busy} className="mt-6 w-full">
                Panggil Berikutnya
              </Button>
            </>
          )}

          {current && (
            <>
              <p className="text-sm text-muted">{current.service.name}</p>
              <p className="mt-2 text-6xl font-bold tabular-nums text-foreground">
                {current.number}
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <StatusBadge status={current.status} />
                <span className="text-xs text-muted">
                  {current.status === "CALLED"
                    ? `dipanggil ${elapsedLabel(current.calledAt, now)} lalu`
                    : `dilayani selama ${elapsedLabel(current.calledAt, now)}`}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2">
                {current.status === "CALLED" && (
                  <>
                    <Button size="lg" onClick={() => transition("SERVING")} disabled={busy}>
                      Mulai Layani
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => transition("SKIPPED")}
                        disabled={busy}
                      >
                        Lewati
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => transition("NO_SHOW")}
                        disabled={busy}
                      >
                        Tidak Hadir
                      </Button>
                    </div>
                  </>
                )}

                {current.status === "SERVING" && (
                  <Button size="lg" onClick={() => transition("DONE")} disabled={busy}>
                    Selesai
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
