/*
  Warnings:

  - You are about to drop the column `postal_code` on the `ShippingZones` table. All the data in the column will be lost.
  - You are about to drop the column `region` on the `ShippingZones` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ShippingZones" DROP COLUMN "postal_code",
DROP COLUMN "region";
