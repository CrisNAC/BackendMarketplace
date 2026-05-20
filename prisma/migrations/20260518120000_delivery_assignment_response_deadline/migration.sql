-- Plazo de respuesta del delivery y estado EXPIRED
ALTER TYPE "AssignmentStatus" ADD VALUE 'EXPIRED';

ALTER TABLE "DeliveryAssignments"
ADD COLUMN IF NOT EXISTS "response_deadline" TIMESTAMPTZ;

ALTER TABLE "Orders"
ADD COLUMN IF NOT EXISTS "delivery_unavailable" BOOLEAN NOT NULL DEFAULT false;
