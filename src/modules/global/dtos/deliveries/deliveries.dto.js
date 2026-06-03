import { z } from "zod";

export const RegisterDeliveryDTO = z.object({
  vehicleType: z.enum(["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"], {
    error: "vehicleType debe ser CAR, MOTORCYCLE, BICYCLE o ON_FOOT"
  }),
  phone: z.string().optional()
});

export const UpdateDeliveryStatusDTO = z.object({
  delivery_status: z.enum(["ACTIVE", "INACTIVE"], {
    error: "delivery_status debe ser ACTIVE o INACTIVE"
  })
});

export const UpdateDeliveryProfileDTO = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres").optional(),
  phone: z.string().optional(),
  vehicleType: z.enum(["CAR", "MOTORCYCLE", "BICYCLE", "ON_FOOT"], {
    error: "vehicleType debe ser CAR, MOTORCYCLE, BICYCLE o ON_FOOT"
  }).optional()
});
