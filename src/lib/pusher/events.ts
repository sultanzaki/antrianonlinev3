import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";

/**
 * MVP realtime design: one global channel carrying all queue events.
 * Kiosk / TV Display / Counter Dashboard each subscribe to this channel
 * and filter client-side by serviceId/counterId as needed. This keeps the
 * MVP simple; if traffic grows, split into per-service channels
 * (`queue-service-<id>`) without changing the payload shape.
 */
export const QUEUE_CHANNEL = "queue-updates";

export const TICKET_EVENT = "ticket-event";

export type TicketEventType =
  | "ticket.created"
  | "ticket.called"
  | "ticket.updated";

export interface TicketEventPayload {
  type: TicketEventType;
  ticket: {
    id: string;
    number: string;
    serviceId: string;
    status: TicketStatus;
    priority: TicketPriority;
    counterId: string | null;
  };
}
