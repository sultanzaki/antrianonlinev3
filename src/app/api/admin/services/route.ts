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

  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ services });
}

const createSchema = z.object({
  name: z.string().min(1),
  prefix: z
    .string()
    .min(1)
    .max(4)
    .transform((s) => s.toUpperCase()),
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
    const service = await prisma.service.create({ data: parsed.data });
    return NextResponse.json({ service }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Prefix sudah dipakai layanan lain" }, { status: 409 });
    }
    throw err;
  }
}
