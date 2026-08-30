import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";

/** Staff-only — used by the Counter Dashboard's counter picker. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const counters = await prisma.counter.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { services: { include: { service: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({
    counters: counters.map((c) => ({
      id: c.id,
      name: c.name,
      services: c.services.map((cs) => cs.service),
    })),
  });
}
