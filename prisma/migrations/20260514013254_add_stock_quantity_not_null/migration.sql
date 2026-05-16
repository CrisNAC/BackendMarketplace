/*
  Warnings:

  - Made the column `quantity` on table `Products` required. This step will fail if there are existing NULL values in that column.

*/

-- Primero, actualizar los valores NULL existentes a 0
UPDATE "Products" SET "quantity" = 0 WHERE "quantity" IS NULL;

-- AlterTable
ALTER TABLE "Products" ALTER COLUMN "quantity" SET NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0;
