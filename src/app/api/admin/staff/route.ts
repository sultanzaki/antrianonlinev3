import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await prisma.staff.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return NextResponse.json({ staff });
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
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

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  try {
    const staff = await prisma.staff.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email sudah dipakai" }, { status: 409 });
    }
    throw err;
  }
}
