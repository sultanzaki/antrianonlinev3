/**
 * Single organization, single timezone for the whole MVP (no multi-tenancy).
 * Used to compute the "business day" for daily ticket-sequence resets so a
 * reset happens at local midnight, not UTC midnight.
 */
export const ORG_TIMEZONE = "Asia/Jakarta";
