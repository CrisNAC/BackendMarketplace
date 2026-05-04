/*
  Warnings:

  - The `vehicle_type` column on the `Deliveries` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'BICYCLE', 'ON_FOOT');

-- DropForeignKey
ALTER TABLE "Deliveries" DROP CONSTRAINT "Deliveries_fk_store_fkey";

-- AlterTable
ALTER TABLE "Deliveries" ALTER COLUMN "fk_store" DROP NOT NULL,
ALTER COLUMN "delivery_status" SET DEFAULT 'INACTIVE',
DROP COLUMN "vehicle_type",
ADD COLUMN     "vehicle_type" "VehicleType" NOT NULL DEFAULT 'CAR';

-- AddForeignKey
ALTER TABLE "Deliveries" ADD CONSTRAINT "Deliveries_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE SET NULL ON UPDATE CASCADE;
