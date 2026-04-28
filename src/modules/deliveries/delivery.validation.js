import {z} from 'zod';

export const registerDeliverySchema=z.object({
    name: z.string().min(2,"Nombre debe tener mínimo 2 caracteres"),
    email: z.string().email("Email invalido"),
    password: z.string().min(6,"Contraseña debe tener mínimo 6 caracteres"),
    phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos") //solo números, 10+ dígitos
})

export const createDeliverySchema= z.object({
    fk_user: z.number().int("Debe ser un numero entero"),
    fk_store: z.number().int("Debe ser un numero entero"),
    delivery_status: z.enum(["AVAILABLE", "ON_THE_WAY", "ASSIGNED", "DELIVERED", "INACTIVE"]).default("AVAILABLE").optional(),
    status: z.boolean().default(true).optional()
})
export const loginDeliverySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password requerido")
});
export const acceptAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});

// Para rechazar asignación
export const rejectAssignmentSchema = z.object({
  id_delivery_assignment: z.number().int().positive("ID debe ser número positivo")
});

// Para actualizar status del delivery
export const updateDeliveryStatusSchema = z.object({
  delivery_status: z.enum(["AVAILABLE", "ON_THE_WAY", "ASSIGNED", "DELIVERED", "INACTIVE"])
});

// Para crear reseña de delivery (después de entrega)
export const createDeliveryReviewSchema = z.object({
  fk_order: z.number().int().positive("Order ID requerido"),
  fk_delivery: z.number().int().positive("Delivery ID requerido"),
  rating: z.number().int().min(1, "Rating mínimo 1").max(5, "Rating máximo 5"),
  comment: z.string().max(500, "Comentario máximo 500 caracteres").optional()
});
