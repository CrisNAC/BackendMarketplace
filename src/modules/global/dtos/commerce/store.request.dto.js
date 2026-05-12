import { z } from "zod";

const categoryIdsSchema = z
  .array(z.number().int().positive("category_ids debe contener IDs válidos"))
  .min(1, "category_ids debe incluir al menos una categoría");

// ─── CREATE ──────────────────────────────────────────────────────
export const CreateStoreDTO = z
  .object({
    fk_user: z
      .number({ error: "fk_user es requerido" })
      .int()
      .positive("fk_user debe ser un ID válido"),
    category_ids: categoryIdsSchema,
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
      .optional(),
    address: z
      .string({ error: "address es requerido" })
      .min(1, "address no puede estar vacío"),
    latitude: z.number({ error: "latitude es requerido" }),
    longitude: z.number({ error: "longitude es requerido" }),
    base_price: z.number({ error: "base_price es requerido" }).nonnegative("base_price no puede ser negativo"),
    distance_price: z.number({ error: "distance_price es requerido" }).nonnegative("distance_price no puede ser negativo")
  });

// ─── UPDATE ──────────────────────────────────────────────────────
export const UpdateStoreDTO = z
  .object({
    category_ids: categoryIdsSchema.optional(),
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
      .optional(),
    address: z.string().min(1, "address no puede estar vacío").optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    base_price: z.number().nonnegative("base_price no puede ser negativo").optional(),
    distance_price: z.number().nonnegative("distance_price no puede ser negativo").optional()
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    {
      message: "Debe enviar al menos un campo para actualizar"
    }
  );

// ─── FILTER ──────────────────────────────────────────────────────
export const FilterStoreDTO = z.object({
  name: z.string().optional(),
  categoryId: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("categoryId debe ser un ID válido"))
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
