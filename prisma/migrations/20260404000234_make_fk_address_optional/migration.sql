-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_fk_address_fkey";

-- AlterTable
ALTER TABLE "Orders" ALTER COLUMN "fk_address" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_address_fkey" FOREIGN KEY ("fk_address") REFERENCES "Addresses"("id_address") ON DELETE SET NULL ON UPDATE CASCADE;
