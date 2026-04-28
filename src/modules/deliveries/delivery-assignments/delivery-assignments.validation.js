import { z } from 'zod';

export const acceptAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});

export const rejectAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});

export const createDeliveryReviewSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido"),
  rating: z.number().int().min(1, "Rating mínimo 1").max(5, "Rating máximo 5"),
  comment: z.string().max(500, "Comentario máximo 500 caracteres").optional()
});