import "server-only";
import { pusherServer } from "@/lib/pusher/server";
import { QUEUE_CHANNEL, TICKET_EVENT, type TicketEventPayload } from "@/lib/pusher/events";
import type { Ticket } from "@/generated/prisma/client";

/**
 * Publish a ticket lifecycle event to the realtime channel.
 *
 * Intentionally fire-and-forget: a Pusher outage must not fail the
 * underlying ticket mutation (the DB write already succeeded). Clients
 * fall back to polling if they miss an event.
 */
export function publishTicketEvent(type: TicketEventPayload["type"], ticket: Ticket) {
  if (!process.env.PUSHER_APP_ID) {
    // Pusher not configured yet (e.g. local dev before credentials are set) — skip silently.
    return;
  }

  const payload: TicketEventPayload = {
    type,
    ticket: {
      id: ticket.id,
      number: ticket.number,
      serviceId: ticket.serviceId,
      status: ticket.status,
      priority: ticket.priority,
      counterId: ticket.counterId,
    },
  };

  pusherServer.trigger(QUEUE_CHANNEL, TICKET_EVENT, payload).catch((err) => {
    console.error("Failed to publish ticket event", err);
  });
}
