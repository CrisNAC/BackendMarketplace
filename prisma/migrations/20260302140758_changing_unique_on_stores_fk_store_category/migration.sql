/*
  Warnings:

  - Made the column `address` on table `Addresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `city` on table `Addresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `region` on table `Addresses` required. This step will fail if there are existing NULL values in that column.
  - Made the column `comment` on table `ProductReviews` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `Products` required. This step will fail if there are existing NULL values in that column.
  - Made the column `base_price` on table `ShippingZones` required. This step will fail if there are existing NULL values in that column.
  - Made the column `distance_price` on table `ShippingZones` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Stores_fk_store_category_key";

-- AlterTable
ALTER TABLE "Addresses" ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL,
ALTER COLUMN "region" SET NOT NULL;

-- AlterTable
ALTER TABLE "ProductReviews" ALTER COLUMN "comment" SET NOT NULL,
ALTER COLUMN "rating" DROP NOT NULL,
ALTER COLUMN "approved" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Products" ALTER COLUMN "price" SET NOT NULL;

-- AlterTable
ALTER TABLE "ShippingZones" ALTER COLUMN "base_price" SET NOT NULL,
ALTER COLUMN "distance_price" SET NOT NULL;
