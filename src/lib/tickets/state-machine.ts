import { TicketStatus } from "@/generated/prisma/enums";

/**
 * Valid ticket status transitions.
 *
 * WAITING -> CALLED is intentionally not listed here: it only ever happens
 * through the atomic "claim next ticket" operation (see call-next.ts),
 * never through the generic transition endpoint, because it also has to
 * assign a counter/staff.
 */
const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  WAITING: [TicketStatus.CANCELLED],
  CALLED: [TicketStatus.SERVING, TicketStatus.SKIPPED, TicketStatus.NO_SHOW],
  SERVING: [TicketStatus.DONE],
  DONE: [],
  SKIPPED: [],
  NO_SHOW: [],
  CANCELLED: [],
};

/** For a target status, which source statuses are allowed to reach it. */
export function fromStatusesFor(toStatus: TicketStatus): TicketStatus[] {
  return (Object.keys(TRANSITIONS) as TicketStatus[]).filter((from) =>
    TRANSITIONS[from].includes(toStatus),
  );
}

/** Statuses that require the acting staff to match the ticket's assigned staff. */
export function requiresOwningStaff(toStatus: TicketStatus): boolean {
  return (
    toStatus === TicketStatus.SERVING ||
    toStatus === TicketStatus.SKIPPED ||
    toStatus === TicketStatus.NO_SHOW ||
    toStatus === TicketStatus.DONE
  );
}

export const GENERIC_TRANSITION_TARGETS = [
  TicketStatus.CANCELLED,
  TicketStatus.SERVING,
  TicketStatus.SKIPPED,
  TicketStatus.NO_SHOW,
  TicketStatus.DONE,
] as const;
