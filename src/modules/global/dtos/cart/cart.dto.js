import { z } from "zod";

export const AddCartItemDTO = z.object({
  productId: z.number({ error: "productId es requerido" }).int().positive("productId debe ser un ID válido"),
  quantity: z.number().int().min(1, "quantity debe ser al menos 1").optional()
});

export const UpdateCartItemDTO = z.object({
  quantity: z.number({ error: "quantity es requerido" }).int().min(1, "quantity debe ser al menos 1")
});
