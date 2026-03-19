import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
export const CreateWishlistDTO = z.object({
  name: z
    .string({ error: "name es requerido" })
    .min(1, "name no puede estar vacío")
    .max(50, "name no puede superar 50 caracteres")
});

export type CreateWishlistDTOType = z.infer<typeof CreateWishlistDTO>;

export const UpdateWishlistDTO = z
  .object({
    name: z
      .string()
      .min(1, "name no puede estar vacío")
      .max(50, "name no puede superar 50 caracteres")
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateWishlistDTOType = z.infer<typeof UpdateWishlistDTO>;

export const FilterWishlistDTO = z.object({
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

export type FilterWishlistDTOType = z.infer<typeof FilterWishlistDTO>;

// ─── WISHLIST ITEM REQUEST ────────────────────────────────────────
export const CreateWishlistItemDTO = z.object({
  fk_product: z
    .number({ error: "fk_product es requerido" })
    .int()
    .positive("fk_product debe ser un ID válido"),

  quantity: z
    .number({ error: "quantity es requerido" })
    .int("quantity debe ser entero")
    .min(1, "quantity debe ser al menos 1")
});

export type CreateWishlistItemDTOType = z.infer<typeof CreateWishlistItemDTO>;

export const UpdateWishlistItemDTO = z
  .object({
    quantity: z
      .number({ error: "quantity debe ser número" })
      .int("quantity debe ser entero")
      .min(1, "quantity debe ser al menos 1")
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateWishlistItemDTOType = z.infer<typeof UpdateWishlistItemDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class WishlistItemResponseDTO {
  id_wishlist_item: number;
  fk_product: number;
  quantity: number;

  constructor(data: any) {
    this.id_wishlist_item = data.id_wishlist_item;
    this.fk_product = data.fk_product;
    this.quantity = data.quantity;
  }
}

export class WishlistResponseDTO extends BaseResponseDTO {
  id_wishlist: number;
  fk_user: number;
  name: string;
  items: WishlistItemResponseDTO[];

  constructor(data: any) {
    super({
      id: data.id_wishlist,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_wishlist = data.id_wishlist;
    this.fk_user = data.fk_user;
    this.name = data.name;
    this.items = data.wishlist_items?.map((i: any) => new WishlistItemResponseDTO(i)) ?? [];
  }

  static map(data: any): WishlistResponseDTO {
    return new WishlistResponseDTO(data);
  }

  static mapList(data: any[]): WishlistResponseDTO[] {
    return data.map(WishlistResponseDTO.map);
  }
}
