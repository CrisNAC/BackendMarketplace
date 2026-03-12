import { z } from "zod";

export const FilterProductDTO = z.object({
    name: z.string().optional(),

    category: z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive("category debe ser un ID válido"))
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
        .optional()
}).refine(
    (data) =>
        data.minPrice === undefined ||
        data.maxPrice === undefined ||
        data.minPrice <= data.maxPrice,
    { message: "minPrice no puede ser mayor que maxPrice", path: ["minPrice"] }
);

export type FilterProductDTOType = z.infer<typeof FilterProductDTO>;