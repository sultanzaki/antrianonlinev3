-- DropIndex
DROP INDEX "tickets_serviceId_createdAt_sequence_key";

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "date" DATE NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tickets_serviceId_date_sequence_key" ON "tickets"("serviceId", "date", "sequence");

