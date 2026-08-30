/** e.g. formatTicketNumber("A", 14) -> "A-014" */
export function formatTicketNumber(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}
