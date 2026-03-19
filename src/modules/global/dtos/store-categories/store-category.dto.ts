import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateStoreCategoryDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacío")
    .max(100, "name no puede superar 100 caracteres")
});

export type CreateStoreCategoryDTOType = z.infer<typeof CreateStoreCategoryDTO>;

export const UpdateStoreCategoryDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacío")
      .max(100, "name no puede superar 100 caracteres")
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateStoreCategoryDTOType = z.infer<typeof UpdateStoreCategoryDTO>;

export const FilterStoreCategoryDTO = z.object({
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

export type FilterStoreCategoryDTOType = z.infer<typeof FilterStoreCategoryDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class StoreCategoryResponseDTO extends BaseResponseDTO {
  id_store_category: number;
  name: string;

  constructor(data: any) {
    super({
      id: data.id_store_category,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_store_category = data.id_store_category;
    this.name = data.name;
  }

  static map(data: any): StoreCategoryResponseDTO {
    return new StoreCategoryResponseDTO(data);
  }

  static mapList(data: any[]): StoreCategoryResponseDTO[] {
    return data.map(StoreCategoryResponseDTO.map);
  }
}
