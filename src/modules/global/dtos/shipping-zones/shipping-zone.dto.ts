import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateShippingZoneDTO = z.object({
  fk_store: z
    .number({ error: "fk_store es requerido" })
    .int()
    .positive("fk_store debe ser un ID válido"),

  region: z
    .string({ error: "region es requerida" })
    .min(1, "region no puede estar vacía")
    .max(50, "region no puede superar 50 caracteres"),

  postal_code: z
    .string()
    .max(20, "postal_code no puede superar 20 caracteres")
    .nullable()
    .optional(),

  base_price: z
    .number({ error: "base_price es requerido" })
    .min(0, "base_price no puede ser negativo"),

  distance_price: z
    .number({ error: "distance_price es requerido" })
    .min(0, "distance_price no puede ser negativo")
});

export type CreateShippingZoneDTOType = z.infer<typeof CreateShippingZoneDTO>;

export const UpdateShippingZoneDTO = z
  .object({
    region: z
      .string()
      .min(1, "region no puede estar vacía")
      .max(50, "region no puede superar 50 caracteres")
      .optional(),

    postal_code: z
      .string()
      .max(20, "postal_code no puede superar 20 caracteres")
      .nullable()
      .optional(),

    base_price: z
      .number({ error: "base_price debe ser número" })
      .min(0, "base_price no puede ser negativo")
      .optional(),

    distance_price: z
      .number({ error: "distance_price debe ser número" })
      .min(0, "distance_price no puede ser negativo")
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateShippingZoneDTOType = z.infer<typeof UpdateShippingZoneDTO>;

export const FilterShippingZoneDTO = z.object({
  fk_store: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("fk_store debe ser un ID válido"))
    .optional(),

  region: z.string().optional(),

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

export type FilterShippingZoneDTOType = z.infer<typeof FilterShippingZoneDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class ShippingZoneResponseDTO extends BaseResponseDTO {
  id_shipping_zone: number;
  fk_store: number;
  region: string;
  postal_code: string | null;
  base_price: number;
  distance_price: number;

  constructor(data: any) {
    super({
      id: data.id_shipping_zone,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_shipping_zone = data.id_shipping_zone;
    this.fk_store = data.fk_store;
    this.region = data.region;
    this.postal_code = data.postal_code ?? null;
    this.base_price = Number(data.base_price);
    this.distance_price = Number(data.distance_price);
  }

  static map(data: any): ShippingZoneResponseDTO {
    return new ShippingZoneResponseDTO(data);
  }

  static mapList(data: any[]): ShippingZoneResponseDTO[] {
    return data.map(ShippingZoneResponseDTO.map);
  }
}
