//delivery.validation.js
import { z } from 'zod';

const vehicleTypeSchema = z.enum(["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"], {
  errorMap: () => ({ message: "vehicleType debe ser CAR, MOTORCYCLE, BICYCLE o ON_FOOT" })
});

export const registerDeliverySchema = z.object({
  vehicleType: vehicleTypeSchema
});
 

export const updateDeliveryProfileSchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres").optional(),
  phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos").optional(),
  vehicleType: vehicleTypeSchema.optional()
});


 
export const updateDeliveryStatusSchema = z.object({
  delivery_status: z.string().optional()
}).refine(
  (data) => data.delivery_status !== undefined,
  {
    message: "delivery_status es requerido",
    path: ["delivery_status"]
  }
).refine(
  (data) => ["ACTIVE", "INACTIVE"].includes(data.delivery_status),
  {
    message: "delivery_status debe ser ACTIVE o INACTIVE",
    path: ["delivery_status"]
  }
);
