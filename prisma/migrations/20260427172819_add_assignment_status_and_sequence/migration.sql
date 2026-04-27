/*
  Warnings:

  - Added the required column `updated_at` to the `DeliveryAssignments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- DropIndex
DROP INDEX "DeliveryAssignments_fk_order_key";

-- AlterTable
ALTER TABLE "DeliveryAssignments" ADD COLUMN     "assignment_sequence" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "assignment_status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMPTZ NOT NULL;
