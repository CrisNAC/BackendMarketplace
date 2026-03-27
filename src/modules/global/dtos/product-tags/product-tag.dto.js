import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";
// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateProductTagDTO = z.object({
    name: z
        .string({ error: "name es requerido" })
        .min(1, "name no puede estar vacío")
        .max(20, "name no puede superar 20 caracteres")
});
export const UpdateProductTagDTO = z
    .object({
    name: z
        .string()
        .min(1, "name no puede estar vacío")
        .max(20, "name no puede superar 20 caracteres")
        .optional()
})
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
});
export const FilterProductTagDTO = z.object({
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
export class ProductTagResponseDTO extends BaseResponseDTO {
    id_product_tag;
    name;
    constructor(data) {
        super({
            id: data.id_product_tag,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
        this.id_product_tag = data.id_product_tag;
        this.name = data.name;
    }
    static map(data) {
        return new ProductTagResponseDTO(data);
    }
    static mapList(data) {
        return data.map(ProductTagResponseDTO.map);
    }
}
