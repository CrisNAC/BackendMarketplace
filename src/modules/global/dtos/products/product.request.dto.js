import { z } from "zod";

const emptyToNull = (v) => (v === "" || v === null ? null : v);

const numericString = (errorMsg) =>
  z.preprocess(
    emptyToNull,
    z.coerce.number({ error: errorMsg }).positive(errorMsg)
  );

const optionalNumericString = z.preprocess(
  emptyToNull,
  z.coerce
    .number()
    .positive()
    .nullable()
    .optional()
);

const booleanish = z.union([
  z.boolean(),
  z.enum(["true", "false", "1", "0"]).transform((v) => v === "true" || v === "1")
]);

const parseCsvTagIds = (val, ctx) => {
  const ids = [];
  for (const part of val.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (!/^\d+$/.test(trimmed)) {
      ctx.addIssue({
        code: "custom",
        message: "tags debe contener IDs válidos",
      });
      return z.NEVER;
    }
    const n = Number.parseInt(trimmed, 10);
    if (n <= 0) {
      ctx.addIssue({
        code: "custom",
        message: "tags debe contener IDs válidos",
      });
      return z.NEVER;
    }
    ids.push(n);
  }
  return ids;
};

const productTagsSchema = z.union([
  z.array(z.number().int().positive("tags debe contener IDs válidos")),
  z.string().transform(parseCsvTagIds),
]);

export const CreateProductDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacio")
    .max(100, "name no puede superar 100 caracteres"),

  price: numericString("price es requerido"),

  offerPrice: optionalNumericString,

  isOffer: booleanish.optional(),

  categoryId: z.preprocess(
    emptyToNull,
    z.coerce
      .number({ error: "categoryId es requerido" })
      .int("categoryId debe ser entero")
      .positive("categoryId debe ser un ID valido")
  ),

  categoryIds: z.array(z.number().int().positive()).optional(),

  description: z
    .string()
    .max(2000, "description no puede superar 2000 caracteres")
    .nullable()
    .optional(),

  quantity: z.preprocess(
    emptyToNull,
    z.coerce
      .number()
      .int("quantity debe ser entero")
      .min(0, "quantity no puede ser negativo")
      .nullable()
      .optional()
  ),

  tags: productTagsSchema.optional().default([]),

  visible: booleanish.optional()
});

export const UpdateProductDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacio")
      .max(100, "name no puede superar 100 caracteres")
      .optional(),

    price: z.preprocess(
      emptyToNull,
      z.coerce
        .number({ error: "price debe ser numero" })
        .positive("price debe ser mayor a 0")
        .optional()
    ),

    offerPrice: optionalNumericString,

    isOffer: booleanish.optional(),

    categoryId: z.preprocess(
      emptyToNull,
      z.coerce
        .number({ error: "categoryId debe ser numero" })
        .int()
        .positive("categoryId debe ser un ID valido")
        .optional()
    ),

    description: z
      .string()
      .max(2000, "description no puede superar 2000 caracteres")
      .nullable()
      .optional(),

    quantity: z.preprocess(
      emptyToNull,
      z.coerce
        .number()
        .int("quantity debe ser entero")
        .min(0, "quantity no puede ser negativo")
        .nullable()
        .optional()
    ),

    tags: productTagsSchema.optional(),

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