import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateAddressDTO = z.object({
  fk_user: z
    .number({ error: "fk_user es requerido" })
    .int()
    .positive("fk_user debe ser un ID válido"),

  fk_store: z
    .number()
    .int()
    .positive("fk_store debe ser un ID válido")
    .nullable()
    .optional(),

  address: z
    .string({ error: "address es requerido" })
    .trim()
    .min(1, "address no puede estar vacío")
    .max(500, "address no puede superar 500 caracteres"),

  city: z
    .string({ error: "city es requerido" })
    .trim()
    .min(1, "city no puede estar vacío")
    .max(100, "city no puede superar 100 caracteres"),

  region: z
    .string({ error: "region es requerida" })
    .trim()
    .min(1, "region no puede estar vacía")
    .max(100, "region no puede superar 100 caracteres"),

  postal_code: z
    .string()
    .trim()
    .max(20, "postal_code no puede superar 20 caracteres")
    .nullable()
    .optional()
});

export type CreateAddressDTOType = z.infer<typeof CreateAddressDTO>;

export const UpdateAddressDTO = z
  .object({
    address: z
      .string()
      .trim()
      .min(1, "address no puede estar vacío")
      .max(500, "address no puede superar 500 caracteres").optional(),

    city: z
      .string()
      .trim()
      .min(1, "city no puede estar vacío")
      .max(100, "city no puede superar 100 caracteres")
      .optional(),

    region: z
      .string()
      .trim()
      .min(1, "region no puede estar vacía")
      .max(100, "region no puede superar 100 caracteres")
      .optional(),

    postal_code: z
      .string()
      .trim()
      .max(20, "postal_code no puede superar 20 caracteres")
      .nullable()
      .optional()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateAddressDTOType = z.infer<typeof UpdateAddressDTO>;

export const FilterAddressDTO = z.object({
  fk_user: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("fk_user debe ser un ID válido"))
    .optional(),

  city: z.string().trim().optional(),
  region: z.string().trim().optional(),

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

export type FilterAddressDTOType = z.infer<typeof FilterAddressDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class AddressResponseDTO extends BaseResponseDTO {
  id_address: number;
  fk_user: number;
  fk_store: number | null;
  address: string;
  city: string;
  region: string;
  postal_code: string | null;

  constructor(data: any) {
    super({
      id: data.id_address,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_address = data.id_address;
    this.fk_user = data.fk_user;
    this.fk_store = data.fk_store ?? null;
    this.address = data.address;
    this.city = data.city;
    this.region = data.region;
    this.postal_code = data.postal_code ?? null;
  }

  static map(data: any): AddressResponseDTO {
    return new AddressResponseDTO(data);
  }

  static mapList(data: any[]): AddressResponseDTO[] {
    return data.map(AddressResponseDTO.map);
  }
}
