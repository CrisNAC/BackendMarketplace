/*
  Warnings:

  - The values [AVAILABLE,ON_THE_WAY,ASSIGNED,DELIVERED] on the enum `DeliveryStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
ALTER TABLE "public"."Deliveries" ALTER COLUMN "delivery_status" DROP DEFAULT;
ALTER TABLE "Deliveries" ALTER COLUMN "delivery_status" TYPE "DeliveryStatus_new" USING ("delivery_status"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "public"."DeliveryStatus_old";
ALTER TABLE "Deliveries" ALTER COLUMN "delivery_status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Deliveries" ALTER COLUMN "delivery_status" SET DEFAULT 'ACTIVE';
