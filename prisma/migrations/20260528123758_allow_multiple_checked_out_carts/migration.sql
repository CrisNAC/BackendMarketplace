/*
  Warnings:

  - A unique constraint covering the columns `[fk_user,fk_store,cart_status]` on the table `Carts` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Carts_fk_user_fk_store_cart_status_key";

-- CreateIndex
CREATE UNIQUE INDEX "Carts_fk_user_fk_store_cart_status_key" ON "Carts"("fk_user", "fk_store", "cart_status") WHERE ("cart_status" = 'ACTIVE');
