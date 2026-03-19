import { z } from "zod";

// ─── CREATE ──────────────────────────────────────────────────────
export const CreateProductDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacío")
    .max(100, "name no puede superar 100 caracteres"),

  price: z
    .number({ error: "price es requerido" })
    .positive("price debe ser mayor a 0"),

  categoryId: z
    .number({ error: "categoryId es requerido" })
    .int("categoryId debe ser entero")
    .positive("categoryId debe ser un ID válido"),

  description: z
    .string()
    .max(2000, "description no puede superar 2000 caracteres")
    .nullable()
    .optional(),

  quantity: z
    .number()
    .int("quantity debe ser entero")
    .min(0, "quantity no puede ser negativo")
    .nullable()
    .optional(),

  tags: z
    .union([
      z.array(z.number().int().positive()),
      z.string().transform((val) =>
        val.split(",").map((v) => {
          const n = Number(v.trim());
          if (!Number.isInteger(n) || n <= 0) throw new Error("tag inválido");
          return n;
        })
      )
    ])
    .optional()
    .default([]),

  visible: z
    .union([
      z.boolean(),
      z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1")
    ])
    .optional()
});

export type CreateProductDTOType = z.infer<typeof CreateProductDTO>;

// ─── UPDATE ──────────────────────────────────────────────────────
export const UpdateProductDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacío")
      .max(100, "name no puede superar 100 caracteres")
      .optional(),

    price: z
      .number({ error: "price debe ser número" })
      .positive("price debe ser mayor a 0")
      .optional(),

    categoryId: z
      .number({ error: "categoryId debe ser número" })
      .int()
      .positive("categoryId debe ser un ID válido")
      .optional(),

    description: z
      .string()
      .max(2000, "description no puede superar 2000 caracteres")
      .nullable()
      .optional(),

    quantity: z
      .number()
      .int("quantity debe ser entero")
      .min(0, "quantity no puede ser negativo")
      .nullable()
      .optional(),

    tags: z
      .union([
        z.array(z.number().int().positive()),
        z.string().transform((val) =>
          val.split(",").map((v) => {
            const n = Number(v.trim());
            if (!Number.isInteger(n) || n <= 0) throw new Error("tag inválido");
            return n;
          })
        )
      ])
      .optional(),

    visible: z
      .union([
        z.boolean(),
        z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1")
      ])
      .optional()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateProductDTOType = z.infer<typeof UpdateProductDTO>;

// ─── FILTER ──────────────────────────────────────────────────────
export const FilterProductDTO = z
  .object({
    name: z.string().optional(),

    categoryId: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive("categoryId debe ser un ID válido"))
      .optional(),

    visible: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),

    minPrice: z
      .string()
      .transform(Number)
      .pipe(z.number().positive("minPrice debe ser mayor a 0"))
      .optional(),

    maxPrice: z
      .string()
      .transform(Number)
      .pipe(z.number().positive("maxPrice debe ser mayor a 0"))
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
  })
  .refine(
    (data) =>
      data.minPrice === undefined ||
      data.maxPrice === undefined ||
      data.minPrice <= data.maxPrice,
    { message: "minPrice no puede ser mayor que maxPrice", path: ["minPrice"] }
  );

export type FilterProductDTOType = z.infer<typeof FilterProductDTO>;
