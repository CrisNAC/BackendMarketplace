//delivery-assignments.validation.js
import { z } from 'zod';

export const createAssignmentSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido"),
  status: z.boolean().default(true).optional()
});

export const acceptAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});

export const rejectAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});
