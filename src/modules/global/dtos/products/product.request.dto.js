import { z } from "zod";

const booleanish = z.union([
  z.boolean(),
  z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1")
]);

export const CreateProductDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacio")
    .max(100, "name no puede superar 100 caracteres"),

  price: z
    .number({ error: "price es requerido" })
    .positive("price debe ser mayor a 0"),

  offerPrice: z
    .number()
    .positive("offerPrice debe ser mayor a 0")
    .nullable()
    .optional(),

  isOffer: booleanish.optional(),

  categoryId: z
    .number({ error: "categoryId es requerido" })
    .int("categoryId debe ser entero")
    .positive("categoryId debe ser un ID valido"),

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
          if (!Number.isInteger(n) || n <= 0) {
            throw new Error("tag invalido");
          }
          return n;
        })
      )
    ])
    .optional()
    .default([]),

  visible: booleanish.optional()
});

export const UpdateProductDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacio")
      .max(100, "name no puede superar 100 caracteres")
      .optional(),

    price: z
      .number({ error: "price debe ser numero" })
      .positive("price debe ser mayor a 0")
      .optional(),

    offerPrice: z
      .number()
      .positive("offerPrice debe ser mayor a 0")
      .nullable()
      .optional(),

    isOffer: booleanish.optional(),

    categoryId: z
      .number({ error: "categoryId debe ser numero" })
      .int()
      .positive("categoryId debe ser un ID valido")
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
            if (!Number.isInteger(n) || n <= 0) {
              throw new Error("tag invalido");
            }
            return n;
          })
        )
      ])
      .optional(),

    visible: booleanish.optional()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });

const emptyToUndefined = (val) =>
  val === "" || val === null ? undefined : val;

export const FilterProductDTO = z.object({
  search: z.preprocess(
    emptyToUndefined,
    z.string().trim().optional()
  ),

  categoryId: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive("categoryId debe ser un ID valido"))
      .optional()
  ),

  isOffer: z.preprocess(
    emptyToUndefined,
    z
      .enum(["true", "false", "1", "0"])
      .transform((v) => v === "true" || v === "1")
      .optional()
  ),

  minPrice: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(Number)
      .pipe(z.number().min(0, "minPrice debe ser mayor o igual a 0"))
      .optional()
  ),

  maxPrice: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(Number)
      .pipe(z.number().min(0, "maxPrice debe ser mayor o igual a 0"))
      .optional()
  ),

  sortBy: z.preprocess(
    emptyToUndefined,
    z
      .enum(["created_at", "price", "name"], {
        error: "sortBy debe ser created_at, price o name"
      })
      .optional()
      .default("created_at")
  ),

  sortOrder: z.preprocess(
    emptyToUndefined,
    z
      .enum(["asc", "desc"], {
        error: "sortOrder debe ser asc o desc"
      })
      .optional()
      .default("desc")
  ),

  page: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive("page debe ser mayor a 0"))
      .optional()
  ),

  limit: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1).max(100, "limit no puede superar 100"))
      .optional()
  )
}).refine(
  (data) =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  { message: "minPrice no puede ser mayor que maxPrice", path: ["minPrice"] }
);