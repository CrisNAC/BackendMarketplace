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

export const FilterProductDTO = z
  .object({
    name: z.string().optional(),

    categoryId: z
      .string()
      .transform(Number)
      .pipe(z.number().int().positive("categoryId debe ser un ID valido"))
      .optional(),

    visible: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .optional(),

    isOffer: z
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
