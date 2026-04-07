import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";
// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateShippingZoneDTO = z.object({
    fk_store: z
        .number({ error: "fk_store es requerido" })
        .int()
        .positive("fk_store debe ser un ID válido"),
    base_price: z
        .number({ error: "base_price es requerido" })
        .min(0, "base_price no puede ser negativo"),
    distance_price: z
        .number({ error: "distance_price es requerido" })
        .min(0, "distance_price no puede ser negativo")
});
export const UpdateShippingZoneDTO = z
    .object({
    base_price: z
        .number({ error: "base_price debe ser número" })
        .min(0, "base_price no puede ser negativo")
        .optional(),
    distance_price: z
        .number({ error: "distance_price debe ser número" })
        .min(0, "distance_price no puede ser negativo")
        .optional()
})
    .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
});
export const FilterShippingZoneDTO = z.object({
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
export class ShippingZoneResponseDTO extends BaseResponseDTO {
    id_shipping_zone;
    fk_store;
    base_price;
    distance_price;
    constructor(data) {
        super({
            id: data.id_shipping_zone,
            created_at: data.created_at,
            updated_at: data.updated_at
        });
        this.id_shipping_zone = data.id_shipping_zone;
        this.fk_store = data.fk_store;
        this.base_price = Number(data.base_price);
        this.distance_price = Number(data.distance_price);
    }
    static map(data) {
        return new ShippingZoneResponseDTO(data);
    }
    static mapList(data) {
        return data.map(ShippingZoneResponseDTO.map);
    }
}
