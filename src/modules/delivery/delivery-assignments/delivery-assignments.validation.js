//delivery-assignments.validation.js
import { z } from 'zod';

export const createAssignmentSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido").optional(),
  status: z.boolean().default(true).optional()
});

export const respondToAssignmentSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT"], {
    error: "action debe ser ACCEPT o REJECT"
  })
});