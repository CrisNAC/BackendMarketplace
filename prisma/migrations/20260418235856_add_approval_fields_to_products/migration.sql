-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "rejection_reason" TEXT;
