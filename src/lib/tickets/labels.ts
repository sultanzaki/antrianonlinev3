import type { TicketStatus } from "@/generated/prisma/enums";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  WAITING: "Menunggu",
  CALLED: "Dipanggil",
  SERVING: "Dilayani",
  DONE: "Selesai",
  SKIPPED: "Dilewati",
  NO_SHOW: "Tidak Hadir",
  CANCELLED: "Dibatalkan",
};
