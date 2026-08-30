import { ORG_TIMEZONE } from "@/lib/config";

/** Today's calendar date in the org's timezone, as "YYYY-MM-DD". */
export function orgTodayDateString(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: ORG_TIMEZONE });
}

/** The org-local calendar date `days` before today, as "YYYY-MM-DD". */
export function orgDateStringDaysAgo(days: number): string {
  const today = orgTodayDateString();
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** The hour (0-23) `at` falls on in the org's timezone. */
export function orgHour(at: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ORG_TIMEZONE,
      hour: "numeric",
      hour12: false,
    }).format(at),
  ) % 24;
}
