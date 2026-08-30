import { NextResponse } from "next/server";
import {
  callNextTicket,
  CounterNotFoundError,
  NoWaitingTicketError,
} from "@/lib/tickets/call-next";
import { getSession } from "@/lib/auth/current-staff";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!session.counterId) {
    return NextResponse.json({ error: "No counter selected for this session" }, { status: 400 });
  }

  try {
    const ticket = await callNextTicket({ counterId: session.counterId, staffId: session.staffId });
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
