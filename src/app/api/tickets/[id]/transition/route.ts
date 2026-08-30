import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transitionTicket, InvalidTransitionError } from "@/lib/tickets/transition";
import { getSession } from "@/lib/auth/current-staff";

const transitionSchema = z.object({
  toStatus: z.enum(["CANCELLED", "SERVING", "SKIPPED", "NO_SHOW", "DONE"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const ticket = await transitionTicket({
      ticketId: id,
      toStatus: parsed.data.toStatus,
      staffId: session.staffId,
    });
    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
