import "server-only";
import { getSession } from "./current-staff";
import type { SessionPayload } from "./session";

/** Returns the session only if it belongs to an ADMIN, otherwise null. */
export async function requireAdminSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}
