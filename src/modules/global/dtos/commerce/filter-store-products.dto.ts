import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

export const FilterStoreProductsDTO = z
  .object({
    name: z.string().trim().optional(),

    category: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive("category debe ser un ID valido"))
        .optional()
    ),

    price_min: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .transform(Number)
        .pipe(z.number().min(0, "price_min debe ser mayor o igual a 0"))
        .optional()
    ),

    price_max: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .transform(Number)
        .pipe(z.number().min(0, "price_max debe ser mayor o igual a 0"))
        .optional()
    ),

    available: z.preprocess(
      emptyToUndefined,
      z
        .enum(["true", "false", "1", "0"])
        .transform((value) => value === "true" || value === "1")
        .optional()
    ),

    isOffer: z.preprocess(
      emptyToUndefined,
      z
        .enum(["true", "false", "1", "0"])
        .transform((value) => value === "true" || value === "1")
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
    )
  })
  .refine(
    (data) =>
      data.price_min === undefined ||
      data.price_max === undefined ||
      data.price_min <= data.price_max,
    {
      message: "price_min no puede ser mayor que price_max",
      path: ["price_min"]
    }
  );

export type FilterStoreProductsDTOType = z.infer<typeof FilterStoreProductsDTO>;
