/*
  Warnings:

  - Made the column `fk_category` on table `StoreCategories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fk_store` on table `StoreCategories` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "StoreCategories" DROP CONSTRAINT "StoreCategories_fk_category_fkey";

-- DropForeignKey
ALTER TABLE "StoreCategories" DROP CONSTRAINT "StoreCategories_fk_store_fkey";

-- AlterTable
ALTER TABLE "StoreCategories" ALTER COLUMN "fk_category" SET NOT NULL,
ALTER COLUMN "fk_store" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_category_fkey" FOREIGN KEY ("fk_category") REFERENCES "Categories"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;
