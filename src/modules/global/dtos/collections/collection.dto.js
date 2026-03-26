import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";
// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateCollectionDTO = z.object({
    fk_store: z
        .number({ error: "fk_store es requerido" })
        .int()
        .positive("fk_store debe ser un ID válido"),
    title: z
        .string({ error: "title es requerido" })
        .min(1, "title no puede estar vacío")
        .max(100, "title no puede superar 100 caracteres"),
    description: z
        .string()
        .max(2000, "description no puede superar 2000 caracteres")
        .nullable()
        .optional(),
    productIds: z
        .array(z.number().int().positive("Cada productId debe ser un ID válido"))
        .optional()
        .default([])
});
export const UpdateCollectionDTO = z
    .object({
    title: z
        .string()
        .min(1, "title no puede estar vacío")
        .max(100, "title no puede superar 100 caracteres")
        .optional(),
    description: z
        .string()
        .max(2000, "description no puede superar 2000 caracteres")
        .nullable()
        .optional()
})
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
});
export const FilterCollectionDTO = z.object({
    title: z.string().optional(),
    fk_store: z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive("fk_store debe ser un ID válido"))
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
});
// ─── RESPONSE ────────────────────────────────────────────────────
export class CollectionResponseDTO extends BaseResponseDTO {
    id_collection;
    fk_store;
    title;
    description;
    constructor(data) {
        super({
            id: data.id_collection,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
        this.id_collection = data.id_collection;
        this.fk_store = data.fk_store;
        this.title = data.title;
        this.description = data.description ?? null;
    }
    static map(data) {
        return new CollectionResponseDTO(data);
    }
    static mapList(data) {
        return data.map(CollectionResponseDTO.map);
    }
}
