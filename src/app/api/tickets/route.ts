import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createTicket, ServiceNotFoundError } from "@/lib/tickets/create";

const createTicketSchema = z.object({
  serviceId: z.string().min(1),
  priority: z.enum(["NORMAL", "PRIORITY"]).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const ticket = await createTicket(parsed.data);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    if (err instanceof ServiceNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

const listQuerySchema = z.object({
  serviceId: z.string().optional(),
  status: z
    .enum(["WAITING", "CALLED", "SERVING", "DONE", "SKIPPED", "NO_SHOW", "CANCELLED"])
    .optional(),
  counterId: z.string().optional(),
});

/** Used by the TV Display and Counter Dashboard for the initial load / fallback refresh. */
export async function GET(request: NextRequest) {
  const parsed = listQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceId, status, counterId } = parsed.data;
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(serviceId && { serviceId }),
      ...(status && { status }),
      ...(counterId && { counterId }),
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 200,
  });

  return NextResponse.json({ tickets });
}
