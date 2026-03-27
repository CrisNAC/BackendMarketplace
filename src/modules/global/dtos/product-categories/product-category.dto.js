import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";
// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateProductCategoryDTO = z.object({
    name: z
        .string({
            error: (issue) => issue.input === undefined
                ? "name es requerido"
                : "name debe ser un texto"
        })
        .trim()
        .min(1, "name no puede estar vacío")
        .max(100, "name no puede superar 100 caracteres")
});
export const UpdateProductCategoryDTO = z
    .object({
        name: z
            .string({
                error: (issue) => issue.input === undefined
                    ? "name es requerido"
                    : "name debe ser un texto"
            })
            .trim()
            .min(1, "name no puede estar vacío")
            .max(100, "name no puede superar 100 caracteres")
            .optional()
    })
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
        message: "Debe enviar al menos un campo para actualizar"
    });
export const FilterProductCategoryDTO = z.object({
    name: z.string().optional(),
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
// ─── RESPONSE ────────────────────────────────────────────────────
export class ProductCategoryResponseDTO extends BaseResponseDTO {
    id_product_category;
    name;
    constructor(data) {
        super({
            id: data.id_product_category,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
        this.id_product_category = data.id_product_category;
        this.name = data.name;
    }
    static map(data) {
        return new ProductCategoryResponseDTO(data);
    }
    static mapList(data) {
        return data.map(ProductCategoryResponseDTO.map);
    }
}
