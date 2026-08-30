import "server-only";
import { prisma } from "@/lib/prisma";
import { publishTicketEvent } from "./realtime";
import type { Ticket } from "@/generated/prisma/client";

export class CounterNotFoundError extends Error {
  constructor(counterId: string) {
    super(`Counter ${counterId} not found or inactive`);
    this.name = "CounterNotFoundError";
  }
}

export class NoWaitingTicketError extends Error {
  constructor() {
    super("No waiting ticket available for this counter's services");
    this.name = "NoWaitingTicketError";
  }
}

interface CallNextInput {
  counterId: string;
  /** TODO: replace with the authenticated staff's id once staff login exists. */
  staffId: string;
}

/**
 * Atomically claim the next WAITING ticket (priority first, then FIFO) for
 * any service the counter is configured to serve, and assign it to this
 * counter/staff.
 *
 * Concurrency: the SELECT that picks the candidate row and the UPDATE that
 * claims it happen as a single SQL statement using
 * `FOR UPDATE SKIP LOCKED`, the standard atomic "claim a job" pattern. If
 * two counters call this at the same instant, Postgres guarantees each
 * gets a different ticket (or one gets `NoWaitingTicketError`) — never the
 * same ticket twice.
 */
export async function callNextTicket({ counterId, staffId }: CallNextInput): Promise<Ticket> {
  const counter = await prisma.counter.findUnique({
    where: { id: counterId },
    include: { services: { select: { serviceId: true } } },
  });
  if (!counter || !counter.isActive) {
    throw new CounterNotFoundError(counterId);
  }

  const serviceIds = counter.services.map((s) => s.serviceId);
  if (serviceIds.length === 0) {
    throw new NoWaitingTicketError();
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const [claimed] = await tx.$queryRaw<Ticket[]>`
      UPDATE "tickets"
      SET "status" = 'CALLED',
          "counterId" = ${counterId},
          "staffId" = ${staffId},
          "calledAt" = now(),
          "version" = "version" + 1
      WHERE "id" = (
        SELECT "id" FROM "tickets"
        WHERE "serviceId" = ANY(${serviceIds}::text[]) AND "status" = 'WAITING'
        ORDER BY CASE "priority" WHEN 'PRIORITY' THEN 0 ELSE 1 END, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    if (!claimed) {
      throw new NoWaitingTicketError();
    }

    await tx.ticketEvent.create({
      data: {
        ticketId: claimed.id,
        fromStatus: "WAITING",
        toStatus: claimed.status,
        counterId,
        staffId,
      },
    });

    return claimed;
  });

  publishTicketEvent("ticket.called", ticket);

  return ticket;
}
