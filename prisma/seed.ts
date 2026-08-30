import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const pendaftaran = await prisma.service.upsert({
    where: { prefix: "A" },
    update: {},
    create: { name: "Pendaftaran", prefix: "A" },
  });

  const kasir = await prisma.service.upsert({
    where: { prefix: "B" },
    update: {},
    create: { name: "Kasir", prefix: "B" },
  });

  const loket1 = await prisma.counter.upsert({
    where: { name: "Loket 1" },
    update: {},
    create: { name: "Loket 1" },
  });

  const loket2 = await prisma.counter.upsert({
    where: { name: "Loket 2" },
    update: {},
    create: { name: "Loket 2" },
  });

  await prisma.counterService.upsert({
    where: { counterId_serviceId: { counterId: loket1.id, serviceId: pendaftaran.id } },
    update: {},
    create: { counterId: loket1.id, serviceId: pendaftaran.id },
  });
  await prisma.counterService.upsert({
    where: { counterId_serviceId: { counterId: loket2.id, serviceId: kasir.id } },
    update: {},
    create: { counterId: loket2.id, serviceId: kasir.id },
  });

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.staff.upsert({
    where: { email: "admin@antrian.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@antrian.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Seed complete:", {
    services: [pendaftaran.name, kasir.name],
    counters: [loket1.name, loket2.name],
    admin: "admin@antrian.local / admin123",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
