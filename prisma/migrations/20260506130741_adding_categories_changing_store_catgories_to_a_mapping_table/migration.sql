/*
  Warnings:

  - You are about to drop the column `name` on the `StoreCategories` table. All the data in the column will be lost.
  - You are about to drop the column `fk_store_category` on the `Stores` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fk_store,fk_category]` on the table `StoreCategories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fk_category` to the `StoreCategories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_store` to the `StoreCategories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Stores" DROP CONSTRAINT "Stores_fk_store_category_fkey";

-- AlterTable
ALTER TABLE "StoreCategories" DROP COLUMN "name",
ADD COLUMN     "fk_category" INTEGER NOT NULL,
ADD COLUMN     "fk_store" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Stores" DROP COLUMN "fk_store_category";

-- CreateTable
CREATE TABLE "Categories" (
    "id_category" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("id_category")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreCategories_fk_store_fk_category_key" ON "StoreCategories"("fk_store", "fk_category");

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCategories" ADD CONSTRAINT "StoreCategories_fk_category_fkey" FOREIGN KEY ("fk_category") REFERENCES "Categories"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;
