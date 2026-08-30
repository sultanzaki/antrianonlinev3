import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Public — used by the Kiosk to list services a customer can queue for. */
export async function GET() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, prefix: true },
  });
  return NextResponse.json({ services });
}
