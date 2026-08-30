import { SignJWT, jwtVerify } from "jose";
import { StaffRole } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h shift

export interface SessionPayload {
  staffId: string;
  name: string;
  role: StaffRole;
  /** Set once the staff picks which counter they're sitting at. */
  counterId?: string;
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

/** Edge-safe: verifies the signature/expiry only, no DB access. */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.staffId !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return {
      staffId: payload.staffId,
      name: payload.name,
      role: payload.role as StaffRole,
      counterId: typeof payload.counterId === "string" ? payload.counterId : undefined,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
