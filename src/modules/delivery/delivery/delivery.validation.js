//delivery.validation.js
import {z} from 'zod';

export const registerDeliverySchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener mínimo 6 caracteres"),
  phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos")
});

export const createDeliverySchema = z.object({
  fk_user: z.number().int().positive("Debe ser un número entero positivo"),
  fk_store: z.number().int().positive("Debe ser un número entero positivo"),
  delivery_status: z.enum(["AVAILABLE", "ON_THE_WAY", "ASSIGNED", "DELIVERED", "INACTIVE"]).default("AVAILABLE").optional(),
  status: z.boolean().default(true).optional()
});

export const loginDeliverySchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Password requerido")
});

export const updateDeliveryStatusSchema = z.object({
  delivery_status: z.enum(["AVAILABLE", "ON_THE_WAY", "ASSIGNED", "DELIVERED", "INACTIVE"])
});

export const updateDeliverySchema = z.object({
  name: z.string().min(2, "Nombre debe tener mínimo 2 caracteres").optional(),
  email: z.string().email("Email inválido").optional(),
  phone: z.string().regex(/^\d{10,}$/, "Teléfono debe tener mínimo 10 dígitos").optional(),
  avatar_url: z.string().url("URL inválida").optional().nullable()
}).refine(
  (data) => Object.values(data).some(v => v !== undefined),
  { message: "Debe enviar al menos un campo para actualizar" }
);