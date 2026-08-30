import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  callNextTicket,
  CounterNotFoundError,
  NoWaitingTicketError,
} from "@/lib/tickets/call-next";

const callNextSchema = z.object({
  counterId: z.string().min(1),
  // TODO: derive from the authenticated staff session instead of the body
  // once staff login exists.
  staffId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = callNextSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const ticket = await callNextTicket(parsed.data);
    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof CounterNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof NoWaitingTicketError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
