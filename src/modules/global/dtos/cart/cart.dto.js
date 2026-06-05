import { z } from "zod";

export const AddCartItemDTO = z.object({
  productId: z.coerce
    .number({ error: "productId es requerido" })
    .int()
    .positive("productId debe ser un ID válido"),
  quantity: z.coerce
    .number()
    .int("quantity debe ser entero")
    .min(1, "quantity debe ser al menos 1")
    .optional()
});

export const UpdateCartItemDTO = z.object({
  quantity: z.coerce
    .number({ error: "quantity es requerido" })
    .int("quantity debe ser entero")
    .min(1, "quantity debe ser al menos 1")
});
