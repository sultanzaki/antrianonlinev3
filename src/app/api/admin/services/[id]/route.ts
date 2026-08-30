import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  prefix: z
    .string()
    .min(1)
    .max(4)
    .transform((s) => s.toUpperCase())
    .optional(),
  isActive: z.boolean().optional(),
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

  try {
    const service = await prisma.service.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ service });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Prefix sudah dipakai layanan lain" }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Layanan tidak ditemukan" }, { status: 404 });
    }
    throw err;
  }
}
