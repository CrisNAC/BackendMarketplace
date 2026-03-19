import { z } from "zod";

// ─── CREATE ──────────────────────────────────────────────────────
export const CreateUserDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacío")
    .max(100, "name no puede superar 100 caracteres"),

  email: z
    .string({ error: "email es requerido" })
    .email("email no tiene formato válido")
    .max(100, "email no puede superar 100 caracteres"),

  password: z
    .string({ error: "password es requerido" })
    .min(8, "password debe tener al menos 8 caracteres")
    .max(255, "password no puede superar 255 caracteres"),

  phone: z
    .string()
    .max(20, "phone no puede superar 20 caracteres")
    .nullable()
    .optional(),

  role: z
    .enum(["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"], {
      error: "role debe ser ADMIN, CUSTOMER, SELLER o DELIVERY"
    })
    .optional()
    .default("CUSTOMER")
});

export type CreateUserDTOType = z.infer<typeof CreateUserDTO>;

// ─── UPDATE ──────────────────────────────────────────────────────
export const UpdateUserDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacío")
      .max(100, "name no puede superar 100 caracteres")
      .optional(),

    email: z
      .string()
      .email("email no tiene formato válido")
      .max(100, "email no puede superar 100 caracteres")
      .optional(),

    password: z
      .string()
      .min(8, "password debe tener al menos 8 caracteres")
      .max(255, "password no puede superar 255 caracteres")
      .optional(),

    phone: z
      .string()
      .max(20, "phone no puede superar 20 caracteres")
      .nullable()
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateUserDTOType = z.infer<typeof UpdateUserDTO>;

// ─── FILTER ──────────────────────────────────────────────────────
export const FilterUserDTO = z.object({
  name: z.string().optional(),

  email: z
    .string()
    .email("email no tiene formato válido")
    .optional(),

  role: z
    .enum(["ADMIN", "CUSTOMER", "SELLER", "DELIVERY"], {
      error: "role debe ser ADMIN, CUSTOMER, SELLER o DELIVERY"
    })
    .optional(),

  page: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("page debe ser mayor a 0"))
    .optional()
    .default(1),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100, "limit no puede superar 100"))
    .optional()
    .default(10)
});

export type FilterUserDTOType = z.infer<typeof FilterUserDTO>;
