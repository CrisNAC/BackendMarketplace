/*
  Warnings:

  - You are about to drop the column `fk_wishlist` on the `Orders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fk_cart]` on the table `Orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `is_offer_applied` to the `OrderItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `original_price` to the `OrderItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `price` to the `OrderItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_cart` to the `Orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fk_store` to the `Orders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "Orders" DROP CONSTRAINT "Orders_fk_wishlist_fkey";

-- DropIndex
DROP INDEX "Orders_fk_wishlist_key";

-- AlterTable
ALTER TABLE "OrderItems" ADD COLUMN     "is_offer_applied" BOOLEAN NOT NULL,
ADD COLUMN     "original_price" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "price" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "fk_wishlist",
ADD COLUMN     "fk_cart" INTEGER NOT NULL,
ADD COLUMN     "fk_store" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "is_offer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offer_price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "Stores" ADD COLUMN     "store_status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Carts" (
    "id_cart" SERIAL NOT NULL,
    "fk_user" INTEGER NOT NULL,
    "fk_store" INTEGER NOT NULL,
    "cart_status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "Carts_pkey" PRIMARY KEY ("id_cart")
);

-- CreateTable
CREATE TABLE "CartItems" (
    "id_cart_item" SERIAL NOT NULL,
    "fk_cart" INTEGER NOT NULL,
    "fk_product" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CartItems_pkey" PRIMARY KEY ("id_cart_item")
);

-- CreateIndex
CREATE UNIQUE INDEX "Carts_fk_user_fk_store_cart_status_key" ON "Carts"("fk_user", "fk_store", "cart_status");

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_fk_cart_fk_product_key" ON "CartItems"("fk_cart", "fk_product");

-- CreateIndex
CREATE UNIQUE INDEX "Orders_fk_cart_key" ON "Orders"("fk_cart");

-- AddForeignKey
ALTER TABLE "Carts" ADD CONSTRAINT "Carts_fk_user_fkey" FOREIGN KEY ("fk_user") REFERENCES "Users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Carts" ADD CONSTRAINT "Carts_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_fk_cart_fkey" FOREIGN KEY ("fk_cart") REFERENCES "Carts"("id_cart") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItems" ADD CONSTRAINT "CartItems_fk_product_fkey" FOREIGN KEY ("fk_product") REFERENCES "Products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_cart_fkey" FOREIGN KEY ("fk_cart") REFERENCES "Carts"("id_cart") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_fk_store_fkey" FOREIGN KEY ("fk_store") REFERENCES "Stores"("id_store") ON DELETE RESTRICT ON UPDATE CASCADE;
