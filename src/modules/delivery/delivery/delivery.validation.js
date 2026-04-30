//delivery.validation.js
import { z } from 'zod';
 
export const registerDeliverySchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener mínimo 6 caracteres"),
  phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos")
});
 

export const updateDeliveryProfileSchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres").optional(),
  phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos").optional(),
  vehicleType: z.string().min(1, "Tipo de vehículo no puede estar vacío").max(50, "Tipo de vehículo no puede exceder 50 caracteres").optional()
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
