-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "shipping_distance_km" DECIMAL(8,2);
