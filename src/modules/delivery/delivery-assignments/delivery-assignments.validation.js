//delivery-assignments.validation.js
import { z } from 'zod';

export const createAssignmentSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido"),
  status: z.boolean().default(true).optional()
});


