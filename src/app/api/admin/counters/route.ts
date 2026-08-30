import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const counters = await prisma.counter.findMany({
    orderBy: { name: "asc" },
    include: { services: { include: { service: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({
    counters: counters.map((c) => ({
      id: c.id,
      name: c.name,
      isActive: c.isActive,
      services: c.services.map((cs) => cs.service),
    })),
  });
}

const createSchema = z.object({
  name: z.string().min(1),
  serviceIds: z.array(z.string()).default([]),
});

export async function POST(request: NextRequest) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const counter = await prisma.counter.create({
      data: {
        name: parsed.data.name,
        services: { create: parsed.data.serviceIds.map((serviceId) => ({ serviceId })) },
      },
    });
    return NextResponse.json({ counter }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Nama loket sudah dipakai" }, { status: 409 });
    }
    throw err;
  }
}
