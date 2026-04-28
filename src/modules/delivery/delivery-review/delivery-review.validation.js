//delivery-review.validation.js
import { z } from 'zod';

export const createDeliveryReviewSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido"),
  rating: z.number().int().min(1, "Rating mínimo 1").max(5, "Rating máximo 5"),
  comment: z.string().max(500, "Comentario máximo 500 caracteres").optional()
});

export const updateDeliveryReviewSchema = z.object({
  rating: z.number().int().min(1, "Rating mínimo 1").max(5, "Rating máximo 5").optional(),
  comment: z.string().max(500, "Comentario máximo 500 caracteres").optional()
}).refine(
  (data) => Object.values(data).some(v => v !== undefined),
  { message: "Debe enviar al menos un campo para actualizar" }
);