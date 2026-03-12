import { z } from "zod";

export const GetReviewsDTO = z.object({
    page: z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive("page debe ser mayor a 0"))
        .optional()
        .default("1"),

    limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().min(1).max(100, "limit no puede superar 100"))
        .optional()
        .default("10")
});

export type GetReviewsDTOType = z.infer<typeof GetReviewsDTO>;