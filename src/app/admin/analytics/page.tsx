"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { STATUS_LABELS } from "@/lib/tickets/labels";
import type { TicketStatus } from "@/generated/prisma/enums";

type Range = "today" | "7d" | "30d";

interface Analytics {
  range: Range;
  totalTickets: number;
  avgWaitSeconds: number | null;
  avgServiceSeconds: number | null;
  statusBreakdown: { status: TicketStatus; count: number }[];
  perService: { serviceName: string; count: number }[];
  perCounter: { counterName: string; count: number; avgServiceSeconds: number | null }[];
  dailyTrend: { date: string; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "today", label: "Hari ini" },
  { value: "7d", label: "7 hari terakhir" },
  { value: "30d", label: "30 hari terakhir" },
];

// Reuses the same semantic colors as the StatusBadge component elsewhere,
// so a status means the same color everywhere in the app.
const STATUS_BAR_COLOR: Record<TicketStatus, string> = {
  WAITING: "bg-status-waiting",
  CALLED: "bg-status-called",
  SERVING: "bg-status-serving",
  DONE: "bg-status-done",
  SKIPPED: "bg-status-negative",
  NO_SHOW: "bg-status-negative",
  CANCELLED: "bg-status-done",
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "<1 menit";
  if (minutes < 60) return `${minutes} menit`;
  return `${Math.floor(minutes / 60)} jam ${minutes % 60} menit`;
}

function formatDayLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
    </Card>
  );
}

/** Horizontal bars for a small number of categories — label left, bar + value right. */
function HorizontalBars({
  items,
  barClassName = "bg-brand",
}: {
  items: { label: string; value: number; colorClassName?: string }[];
  barClassName?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 text-sm">
          <span className="w-32 shrink-0 truncate text-muted" title={item.label}>
            {item.label}
          </span>
          <div className="h-6 flex-1 rounded-md bg-brand-muted">
            <div
              className={`h-6 rounded-md ${item.colorClassName ?? barClassName}`}
              style={{ width: `${(item.value / max) * 100}%` }}
              title={`${item.label}: ${item.value}`}
            />
          </div>
          <span className="w-8 shrink-0 text-right font-medium tabular-nums text-foreground">
            {item.value}
          </span>
        </div>
      ))}
      {items.length === 0 && <p className="text-sm text-muted">Belum ada data</p>}
    </div>
  );
}

/** Thin columns for an ordered x-axis (hour of day, day of range). */
function ColumnBars({ items }: { items: { label: string; value: number; title: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      {/* Fixed-height track so the bars' percentage heights have a real
          basis — a flex child's height is otherwise "auto", against which
          percentage heights resolve to nothing. */}
      <div className="flex h-32 items-end gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full min-w-[2px] rounded-t-sm bg-brand"
              style={{ height: `${Math.max(2, (item.value / max) * 100)}%` }}
              title={item.title}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {items.map((item, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted">
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/analytics?range=${range}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) {
          setData(body);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Gagal memuat data analitik");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Analitik</h1>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setLoading(true);
                setRange(opt.value);
              }}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                range === opt.value ? "bg-brand text-brand-foreground" : "text-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-status-negative">{error}</p>}
      {loading && <p className="text-sm text-muted">Memuat...</p>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile label="Total tiket" value={String(data.totalTickets)} />
            <StatTile label="Rata-rata waktu tunggu" value={formatDuration(data.avgWaitSeconds)} />
            <StatTile
              label="Rata-rata waktu layanan"
              value={formatDuration(data.avgServiceSeconds)}
            />
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-medium text-foreground">Tiket per Status</h2>
            <HorizontalBars
              items={data.statusBreakdown.map((s) => ({
                label: STATUS_LABELS[s.status],
                value: s.count,
                colorClassName: STATUS_BAR_COLOR[s.status],
              }))}
            />
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Tiket per Layanan</h2>
              <HorizontalBars
                items={data.perService.map((s) => ({ label: s.serviceName, value: s.count }))}
              />
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Tiket per Loket</h2>
              <HorizontalBars
                items={data.perCounter.map((c) => ({ label: c.counterName, value: c.count }))}
              />
              <ul className="mt-4 flex flex-col gap-1 border-t border-border pt-3 text-xs text-muted">
                {data.perCounter.map((c) => (
                  <li key={c.counterName} className="flex justify-between">
                    <span>{c.counterName}</span>
                    <span>rata-rata layanan: {formatDuration(c.avgServiceSeconds)}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-medium text-foreground">Jam Sibuk</h2>
            <ColumnBars
              items={data.hourlyDistribution.map((h) => ({
                label: h.hour % 3 === 0 ? String(h.hour) : "",
                value: h.count,
                title: `Jam ${h.hour}:00 — ${h.count} tiket`,
              }))}
            />
          </Card>

          {data.range !== "today" && (
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-medium text-foreground">Tren Harian</h2>
              <ColumnBars
                items={data.dailyTrend.map((d, i, arr) => {
                  // Sparsify labels so they never collide: ~6 labels total
                  // regardless of range length (7 or 30 days).
                  const step = Math.max(1, Math.ceil(arr.length / 6));
                  const showLabel = i % step === 0 || i === arr.length - 1;
                  return {
                    label: showLabel ? formatDayLabel(d.date) : "",
                    value: d.count,
                    title: `${formatDayLabel(d.date)}: ${d.count} tiket`,
                  };
                })}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
