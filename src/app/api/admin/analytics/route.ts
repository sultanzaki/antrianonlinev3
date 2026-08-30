import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { orgDateStringDaysAgo, orgHour } from "@/lib/tickets/dates";
import type { TicketStatus } from "@/generated/prisma/enums";

const RANGE_DAYS = { today: 0, "7d": 6, "30d": 29 } as const;
type Range = keyof typeof RANGE_DAYS;

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function GET(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rangeParam = request.nextUrl.searchParams.get("range");
  const range: Range = rangeParam === "7d" || rangeParam === "30d" ? rangeParam : "today";
  const startDateString = orgDateStringDaysAgo(RANGE_DAYS[range]);

  const tickets = await prisma.ticket.findMany({
    where: { date: { gte: new Date(`${startDateString}T00:00:00Z`) } },
    select: {
      status: true,
      date: true,
      createdAt: true,
      calledAt: true,
      servedAt: true,
      completedAt: true,
      service: { select: { name: true } },
      counter: { select: { name: true } },
    },
  });

  const statusCounts = new Map<TicketStatus, number>();
  const perServiceCounts = new Map<string, number>();
  const perCounterCounts = new Map<string, number>();
  const perCounterServiceSeconds = new Map<string, number[]>();
  const perDayCounts = new Map<string, number>();
  const hourlyCounts = new Array<number>(24).fill(0);
  const waitSeconds: number[] = [];
  const serviceSeconds: number[] = [];

  for (const t of tickets) {
    statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
    perServiceCounts.set(t.service.name, (perServiceCounts.get(t.service.name) ?? 0) + 1);

    const dayKey = t.date.toISOString().slice(0, 10);
    perDayCounts.set(dayKey, (perDayCounts.get(dayKey) ?? 0) + 1);

    hourlyCounts[orgHour(t.createdAt)] += 1;

    if (t.calledAt) {
      waitSeconds.push((t.calledAt.getTime() - t.createdAt.getTime()) / 1000);
    }

    if (t.counter) {
      perCounterCounts.set(t.counter.name, (perCounterCounts.get(t.counter.name) ?? 0) + 1);
    }

    if (t.servedAt && t.completedAt) {
      const seconds = (t.completedAt.getTime() - t.servedAt.getTime()) / 1000;
      serviceSeconds.push(seconds);
      if (t.counter) {
        const list = perCounterServiceSeconds.get(t.counter.name) ?? [];
        list.push(seconds);
        perCounterServiceSeconds.set(t.counter.name, list);
      }
    }
  }

  const days: string[] = [];
  for (let i = RANGE_DAYS[range]; i >= 0; i--) {
    days.push(orgDateStringDaysAgo(i));
  }

  return NextResponse.json({
    range,
    totalTickets: tickets.length,
    avgWaitSeconds: average(waitSeconds),
    avgServiceSeconds: average(serviceSeconds),
    statusBreakdown: Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    perService: Array.from(perServiceCounts.entries())
      .map(([serviceName, count]) => ({ serviceName, count }))
      .sort((a, b) => b.count - a.count),
    perCounter: Array.from(perCounterCounts.entries())
      .map(([counterName, count]) => ({
        counterName,
        count,
        avgServiceSeconds: average(perCounterServiceSeconds.get(counterName) ?? []),
      }))
      .sort((a, b) => b.count - a.count),
    dailyTrend: days.map((date) => ({ date, count: perDayCounts.get(date) ?? 0 })),
    hourlyDistribution: hourlyCounts.map((count, hour) => ({ hour, count })),
  });
}
