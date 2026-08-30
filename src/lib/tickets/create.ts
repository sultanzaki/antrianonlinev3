import "server-only";
import { prisma } from "@/lib/prisma";
import { ORG_TIMEZONE } from "@/lib/config";
import { formatTicketNumber } from "./format";
import { publishTicketEvent } from "./realtime";
import { TicketPriority } from "@/generated/prisma/enums";
import type { Ticket } from "@/generated/prisma/client";

export class ServiceNotFoundError extends Error {
  constructor(serviceId: string) {
    super(`Service ${serviceId} not found or inactive`);
    this.name = "ServiceNotFoundError";
  }
}

interface CreateTicketInput {
  serviceId: string;
  priority?: TicketPriority;
}

/**
 * Issue a new ticket for a service.
 *
 * Concurrency: the sequence number comes from a single atomic
 * `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` on `ticket_sequences`,
 * which Postgres guarantees is race-free even under many simultaneous
 * kiosk requests for the same service — no explicit row locking needed.
 * The `tickets` table also carries a `(serviceId, date, sequence)` unique
 * constraint as a defense-in-depth check against duplicate numbers.
 */
export async function createTicket({
  serviceId,
  priority = TicketPriority.NORMAL,
}: CreateTicketInput): Promise<Ticket> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.isActive) {
    throw new ServiceNotFoundError(serviceId);
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const [{ lastNumber, today }] = await tx.$queryRaw<{ lastNumber: number; today: Date }[]>`
      INSERT INTO "ticket_sequences" ("serviceId", "date", "lastNumber")
      VALUES (${serviceId}, (now() AT TIME ZONE ${ORG_TIMEZONE})::date, 1)
      ON CONFLICT ("serviceId", "date")
      DO UPDATE SET "lastNumber" = "ticket_sequences"."lastNumber" + 1
      RETURNING "lastNumber", "date" AS today
    `;

    const created = await tx.ticket.create({
      data: {
        serviceId,
        sequence: lastNumber,
        date: today,
        number: formatTicketNumber(service.prefix, lastNumber),
        priority,
      },
    });

    await tx.ticketEvent.create({
      data: { ticketId: created.id, toStatus: created.status },
    });

    return created;
  });

  publishTicketEvent("ticket.created", ticket);

  return ticket;
}
