import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const counter = session.counterId
    ? await prisma.counter.findUnique({
        where: { id: session.counterId },
        select: { id: true, name: true },
      })
    : null;

  return NextResponse.json({ session: { ...session, counterName: counter?.name ?? null } });
}
