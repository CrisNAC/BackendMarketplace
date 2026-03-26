/*
  Warnings:

  - A unique constraint covering the columns `[fk_wishlist,fk_product]` on the table `WishlistItems` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WishlistItems_fk_wishlist_fk_product_key" ON "WishlistItems"("fk_wishlist", "fk_product");
