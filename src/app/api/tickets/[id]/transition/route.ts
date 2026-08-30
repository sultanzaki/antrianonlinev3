import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { transitionTicket, InvalidTransitionError } from "@/lib/tickets/transition";

const transitionSchema = z.object({
  toStatus: z.enum(["CANCELLED", "SERVING", "SKIPPED", "NO_SHOW", "DONE"]),
  // TODO: derive from the authenticated staff session instead of the body
  // once staff login exists.
  staffId: z.string().min(1).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const ticket = await transitionTicket({ ticketId: id, ...parsed.data });
    return NextResponse.json({ ticket });
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
