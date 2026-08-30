import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";

/**
 * The ticket this counter is currently handling (CALLED or SERVING), if
 * any, plus how many WAITING tickets exist for the counter's services (so
 * the dashboard can show "N waiting" without a separate round-trip).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.counterId) {
    return NextResponse.json({ ticket: null, waitingCount: 0 });
  }

  const [ticket, counter] = await Promise.all([
    prisma.ticket.findFirst({
      where: {
        counterId: session.counterId,
        staffId: session.staffId,
        status: { in: ["CALLED", "SERVING"] },
      },
      include: { service: { select: { name: true, prefix: true } } },
      orderBy: { calledAt: "desc" },
    }),
    prisma.counter.findUnique({
      where: { id: session.counterId },
      select: { services: { select: { serviceId: true } } },
    }),
  ]);

  const serviceIds = counter?.services.map((s) => s.serviceId) ?? [];
  const waitingCount = serviceIds.length
    ? await prisma.ticket.count({
        where: { serviceId: { in: serviceIds }, status: "WAITING" },
      })
    : 0;

  return NextResponse.json({ ticket, waitingCount });
}
