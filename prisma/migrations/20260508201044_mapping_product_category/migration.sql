/*
  Warnings:

  - You are about to drop the column `name` on the `ProductCategories` table. All the data in the column will be lost.
  - You are about to drop the column `visible` on the `ProductCategories` table. All the data in the column will be lost.
  - You are about to drop the column `fk_product_category` on the `Products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fk_product,fk_category]` on the table `ProductCategories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fk_category` to the `ProductCategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_product` to the `ProductCategories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Products" DROP CONSTRAINT "Products_fk_product_category_fkey";

-- DropForeignKey
ALTER TABLE "StoreCategories" DROP CONSTRAINT "StoreCategories_fk_category_fkey";

-- DropForeignKey
ALTER TABLE "StoreCategories" DROP CONSTRAINT "StoreCategories_fk_store_fkey";

-- AlterTable
ALTER TABLE "Categories" ADD COLUMN     "visible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ProductCategories" DROP COLUMN "name",
DROP COLUMN "visible",
ADD COLUMN     "fk_category" INTEGER NOT NULL,
ADD COLUMN     "fk_product" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Products" DROP COLUMN "fk_product_category";

-- AlterTable
ALTER TABLE "StoreCategories" ALTER COLUMN "fk_category" DROP NOT NULL,
ALTER COLUMN "fk_store" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategories_fk_product_fk_category_key" ON "ProductCategories"("fk_product", "fk_category");

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_category_fkey" FOREIGN KEY ("fk_category") REFERENCES "Categories"("id_category") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategories" ADD CONSTRAINT "ProductCategories_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategories" ADD CONSTRAINT "ProductCategories_fk_category_fkey" FOREIGN KEY ("fk_category") REFERENCES "Categories"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;
