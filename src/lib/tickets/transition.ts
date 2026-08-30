import "server-only";
import { prisma } from "@/lib/prisma";
import { fromStatusesFor, requiresOwningStaff } from "./state-machine";
import { publishTicketEvent } from "./realtime";
import { Prisma, type Ticket } from "@/generated/prisma/client";
import { TicketStatus } from "@/generated/prisma/enums";

export class InvalidTransitionError extends Error {
  constructor(
    public ticketId: string,
    public toStatus: TicketStatus,
  ) {
    super(
      `Ticket ${ticketId} cannot transition to ${toStatus} — it is not in an eligible ` +
        `status, was already changed by someone else, or does not belong to this staff/counter`,
    );
    this.name = "InvalidTransitionError";
  }
}

interface TransitionInput {
  ticketId: string;
  toStatus: TicketStatus;
  /** Required (and checked against the ticket's assigned staff) for SERVING/SKIPPED/NO_SHOW/DONE. */
  staffId?: string;
}

const EXTRA_SET_SQL: Partial<Record<TicketStatus, Prisma.Sql>> = {
  [TicketStatus.SERVING]: Prisma.sql`, "servedAt" = now()`,
  [TicketStatus.DONE]: Prisma.sql`, "completedAt" = now()`,
};

/**
 * Generic ticket status transition (CANCELLED, SERVING, SKIPPED, NO_SHOW,
 * DONE). WAITING -> CALLED is handled separately by call-next.ts.
 *
 * Concurrency: `SELECT ... FOR UPDATE` locks the row before validating it,
 * and the whole check-then-write runs inside one DB transaction — so if
 * two requests race on the same ticket (e.g. staff double-clicks, or an
 * automated no-show timeout fires while staff clicks "serving"), the
 * second one blocks until the first commits, then re-reads the now-changed
 * status and correctly fails with InvalidTransitionError instead of
 * silently overwriting state.
 */
export async function transitionTicket({
  ticketId,
  toStatus,
  staffId,
}: TransitionInput): Promise<Ticket> {
  const fromStatuses = fromStatusesFor(toStatus);
  if (fromStatuses.length === 0) {
    throw new InvalidTransitionError(ticketId, toStatus);
  }

  if (requiresOwningStaff(toStatus) && !staffId) {
    throw new InvalidTransitionError(ticketId, toStatus);
  }

  const extraSet = EXTRA_SET_SQL[toStatus] ?? Prisma.sql``;

  const ticket = await prisma.$transaction(async (tx) => {
    // Lock the row first so the check-then-write below is race-free: no
    // other transaction can read or modify this ticket until we commit.
    const [current] = await tx.$queryRaw<Ticket[]>`
      SELECT * FROM "tickets" WHERE "id" = ${ticketId} FOR UPDATE
    `;

    if (
      !current ||
      !fromStatuses.includes(current.status) ||
      (requiresOwningStaff(toStatus) && current.staffId !== staffId)
    ) {
      throw new InvalidTransitionError(ticketId, toStatus);
    }

    const [updated] = await tx.$queryRaw<Ticket[]>`
      UPDATE "tickets"
      SET "status" = ${toStatus}::"TicketStatus",
          "version" = "version" + 1
          ${extraSet}
      WHERE "id" = ${ticketId}
      RETURNING *
    `;

    await tx.ticketEvent.create({
      data: {
        ticketId: updated.id,
        fromStatus: current.status,
        toStatus: updated.status,
        counterId: updated.counterId,
        staffId: updated.staffId,
      },
    });

    return updated;
  });

  publishTicketEvent("ticket.updated", ticket);

  return ticket;
}
