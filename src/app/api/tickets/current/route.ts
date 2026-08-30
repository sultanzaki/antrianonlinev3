import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";

/** The ticket this counter is currently handling (CALLED or SERVING), if any. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.counterId) {
    return NextResponse.json({ ticket: null });
  }

  const ticket = await prisma.ticket.findFirst({
    where: {
      counterId: session.counterId,
      staffId: session.staffId,
      status: { in: ["CALLED", "SERVING"] },
    },
    include: { service: { select: { name: true, prefix: true } } },
    orderBy: { calledAt: "desc" },
  });

  return NextResponse.json({ ticket });
}
