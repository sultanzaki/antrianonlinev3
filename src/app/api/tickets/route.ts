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

const TICKET_STATUSES = [
  "WAITING",
  "CALLED",
  "SERVING",
  "DONE",
  "SKIPPED",
  "NO_SHOW",
  "CANCELLED",
] as const;

const listQuerySchema = z.object({
  serviceId: z.string().optional(),
  // Comma-separated, e.g. "CALLED,SERVING"
  status: z
    .string()
    .transform((s) => s.split(","))
    .pipe(z.array(z.enum(TICKET_STATUSES)))
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
      ...(status && { status: { in: status } }),
      ...(counterId && { counterId }),
    },
    include: {
      service: { select: { name: true, prefix: true } },
      counter: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 200,
  });

  return NextResponse.json({ tickets });
}
