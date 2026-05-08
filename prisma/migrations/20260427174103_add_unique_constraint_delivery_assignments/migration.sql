/*
  Warnings:

  - A unique constraint covering the columns `[fk_order,assignment_sequence]` on the table `DeliveryAssignments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAssignments_fk_order_assignment_sequence_key" ON "DeliveryAssignments"("fk_order", "assignment_sequence");
