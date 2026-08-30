import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Prisma } from "@/generated/prisma/client";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "STAFF"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
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

  const { password, ...fields } = parsed.data;

  if (id === session.staffId && (fields.isActive === false || fields.role === "STAFF")) {
    return NextResponse.json(
      { error: "Tidak bisa menonaktifkan atau menurunkan role akun sendiri" },
      { status: 400 },
    );
  }

  try {
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...fields,
        ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    return NextResponse.json({ staff });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email sudah dipakai" }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 });
    }
    throw err;
  }
}
