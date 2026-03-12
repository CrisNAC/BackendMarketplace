import { z } from "zod";

export const CreateProductDTO = z.object({
    name: z
        .string({ required_error: "name es requerido" })
        .min(1, "name no puede estar vacío")
        .max(100, "name no puede superar 100 caracteres"),

    price: z
        .number({ required_error: "price es requerido", invalid_type_error: "price debe ser número" })
        .positive("price debe ser mayor a 0"),

    categoryId: z
        .number({ required_error: "categoryId es requerido", invalid_type_error: "categoryId debe ser número" })
        .int("categoryId debe ser entero")
        .positive(),

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