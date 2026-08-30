import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const staff = await prisma.staff.findUnique({ where: { email } });

  // Compare against a dummy hash even when the staff doesn't exist, so the
  // response time doesn't leak whether the email is registered.
  const passwordHash = staff?.passwordHash ?? "$2b$10$invalidsaltinvalidsaltinvalidsaltinvalidsalt.";
  const valid = await bcrypt.compare(password, passwordHash);

  if (!staff || !staff.isActive || !valid) {
    return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });
  }

  const token = await createSessionToken({
    staffId: staff.id,
    name: staff.name,
    role: staff.role,
  });

  const response = NextResponse.json({
    staff: { id: staff.id, name: staff.name, role: staff.role },
  });
  response.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
  return response;
}
