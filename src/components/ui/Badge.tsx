import type { TicketStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/tickets/labels";

const STATUS_CLASSES: Record<TicketStatus, string> = {
  WAITING: "bg-status-waiting-bg text-status-waiting",
  CALLED: "bg-status-called-bg text-status-called",
  SERVING: "bg-status-serving-bg text-status-serving",
  DONE: "bg-status-done-bg text-status-done",
  SKIPPED: "bg-status-negative-bg text-status-negative",
  NO_SHOW: "bg-status-negative-bg text-status-negative",
  CANCELLED: "bg-status-done-bg text-status-done",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "positive" | "neutral";
  children: React.ReactNode;
}) {
  const cls =
    tone === "positive"
      ? "bg-status-serving-bg text-status-serving"
      : "bg-status-done-bg text-status-done";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{children}</span>;
}
