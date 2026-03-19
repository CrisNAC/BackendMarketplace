import { z } from "zod";

// ─── CREATE ──────────────────────────────────────────────────────
export const CreateStoreDTO = z.object({
  fk_user: z
    .number({ error: "fk_user es requerido" })
    .int()
    .positive("fk_user debe ser un ID válido"),

  fk_store_category: z
    .number({ error: "fk_store_category es requerido" })
    .int()
    .positive("fk_store_category debe ser un ID válido"),

  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacío")
    .max(100, "name no puede superar 100 caracteres"),

  email: z
    .string({ error: "email es requerido" })
    .email("email no tiene formato válido")
    .max(100, "email no puede superar 100 caracteres"),

  phone: z
    .string({ error: "phone es requerido" })
    .min(1, "phone no puede estar vacío")
    .max(20, "phone no puede superar 20 caracteres"),

  description: z
    .string()
    .max(2000, "description no puede superar 2000 caracteres")
    .nullable()
    .optional(),

  logo: z
    .string()
    .url("logo debe ser una URL válida")
    .max(500)
    .nullable()
    .optional(),

  website_url: z
    .string()
    .url("website_url debe ser una URL válida")
    .max(500)
    .nullable()
    .optional(),

  instagram_url: z
    .string()
    .url("instagram_url debe ser una URL válida")
    .max(500)
    .nullable()
    .optional(),

  tiktok_url: z
    .string()
    .url("tiktok_url debe ser una URL válida")
    .max(500)
    .nullable()
    .optional()
});

export type CreateStoreDTOType = z.infer<typeof CreateStoreDTO>;

// ─── UPDATE ──────────────────────────────────────────────────────
export const UpdateStoreDTO = z
  .object({
    fk_store_category: z
      .number()
      .int()
      .positive("fk_store_category debe ser un ID válido")
      .optional(),

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

    phone: z
      .string()
      .min(1, "phone no puede estar vacío")
      .max(20, "phone no puede superar 20 caracteres")
      .optional(),

    description: z
      .string()
      .max(2000, "description no puede superar 2000 caracteres")
      .nullable()
      .optional(),

    logo: z
      .string()
      .url("logo debe ser una URL válida")
      .max(500)
      .nullable()
      .optional(),

    website_url: z
      .string()
      .url("website_url debe ser una URL válida")
      .max(500)
      .nullable()
      .optional(),

    instagram_url: z
      .string()
      .url("instagram_url debe ser una URL válida")
      .max(500)
      .nullable()
      .optional(),

    tiktok_url: z
      .string()
      .url("tiktok_url debe ser una URL válida")
      .max(500)
      .nullable()
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateStoreDTOType = z.infer<typeof UpdateStoreDTO>;

// ─── FILTER ──────────────────────────────────────────────────────
export const FilterStoreDTO = z.object({
  name: z.string().optional(),

  fk_store_category: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("fk_store_category debe ser un ID válido"))
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

export type FilterStoreDTOType = z.infer<typeof FilterStoreDTO>;
