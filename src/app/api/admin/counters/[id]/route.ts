import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  // When present, replaces the full set of services this counter serves.
  serviceIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceIds, ...fields } = parsed.data;

  try {
    const counter = await prisma.$transaction(async (tx) => {
      if (Object.keys(fields).length > 0) {
        await tx.counter.update({ where: { id }, data: fields });
      }

      if (serviceIds) {
        await tx.counterService.deleteMany({ where: { counterId: id } });
        if (serviceIds.length > 0) {
          await tx.counterService.createMany({
            data: serviceIds.map((serviceId) => ({ counterId: id, serviceId })),
          });
        }
      }

      return tx.counter.findUniqueOrThrow({
        where: { id },
        include: { services: { include: { service: { select: { id: true, name: true } } } } },
      });
    });

    return NextResponse.json({
      counter: {
        id: counter.id,
        name: counter.name,
        isActive: counter.isActive,
        services: counter.services.map((cs) => cs.service),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Nama loket sudah dipakai" }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Loket tidak ditemukan" }, { status: 404 });
    }
    throw err;
  }
}
