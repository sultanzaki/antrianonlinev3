import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const session = await getSession();

  if (session?.counterId) {
    await prisma.counterSession.updateMany({
      where: { staffId: session.staffId, counterId: session.counterId, endedAt: null },
      data: { endedAt: new Date() },
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
