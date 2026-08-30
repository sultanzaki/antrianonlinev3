import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/current-staff";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

const schema = z.object({ counterId: z.string().min(1) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const counter = await prisma.counter.findUnique({ where: { id: parsed.data.counterId } });
  if (!counter || !counter.isActive) {
    return NextResponse.json({ error: "Counter not found" }, { status: 404 });
  }

  await prisma.$transaction([
    // Close out any session this staff left open elsewhere (e.g. browser closed
    // without logging out) before starting a fresh one.
    prisma.counterSession.updateMany({
      where: { staffId: session.staffId, endedAt: null },
      data: { endedAt: new Date() },
    }),
    prisma.counterSession.create({
      data: { staffId: session.staffId, counterId: counter.id },
    }),
  ]);

  const token = await createSessionToken({ ...session, counterId: counter.id });
  const response = NextResponse.json({ ok: true, counter: { id: counter.id, name: counter.name } });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
