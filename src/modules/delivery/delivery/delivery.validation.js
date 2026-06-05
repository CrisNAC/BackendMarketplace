//delivery.validation.js
import { z } from 'zod';
import { DELIVERY_PHONE_MESSAGE, DELIVERY_PHONE_REGEX } from '../../../lib/phone.js';

const vehicleTypeSchema = z.enum(["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"], {
  message: "vehicleType debe ser CAR, MOTORCYCLE, BICYCLE o ON_FOOT",
});

const deliveryPhoneSchema = z
  .string()
  .regex(DELIVERY_PHONE_REGEX, DELIVERY_PHONE_MESSAGE);

export const registerDeliverySchema = z.object({
  vehicleType: vehicleTypeSchema,
  phone: deliveryPhoneSchema.optional(),
});
 

export const updateDeliveryProfileSchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres").optional(),
  phone: deliveryPhoneSchema.optional(),
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
