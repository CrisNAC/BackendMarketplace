import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto.js";

// ─── REQUEST ─────────────────────────────────────────────────────
const OrderItemRequestDTO = z.object({
  fk_product: z
    .number({ error: "fk_product es requerido" })
    .int()
    .positive("fk_product debe ser un ID válido"),

  quantity: z
    .number({ error: "quantity es requerido" })
    .int("quantity debe ser entero")
    .min(1, "quantity debe ser al menos 1")
});

export const CreateOrderDTO = z.object({
  fk_address: z
    .number({ error: "fk_address es requerido" })
    .int()
    .positive("fk_address debe ser un ID válido"),

  fk_wishlist: z
    .number({ error: "fk_wishlist es requerido" })
    .int()
    .positive("fk_wishlist debe ser un ID válido"),

  notes: z
    .string()
    .max(2000, "notes no puede superar 2000 caracteres")
    .nullable()
    .optional(),

  items: z
    .array(OrderItemRequestDTO)
    .min(1, "El pedido debe tener al menos un producto")
});

export type CreateOrderDTOType = z.infer<typeof CreateOrderDTO>;

export const UpdateOrderDTO = z
  .object({
    order_status: z
      .enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"], {
        error: "order_status debe ser PENDING, PROCESSING, SHIPPED, DELIVERED o CANCELLED"
      })
      .optional(),

    notes: z
      .string()
      .max(2000, "notes no puede superar 2000 caracteres")
      .nullable()
      .optional(),

    fk_address: z
      .number()
      .int()
      .positive("fk_address debe ser un ID válido")
      .optional()
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "Debe enviar al menos un campo para actualizar"
  });

export type UpdateOrderDTOType = z.infer<typeof UpdateOrderDTO>;

export const FilterOrderDTO = z.object({
  fk_user: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive("fk_user debe ser un ID válido"))
    .optional(),

  order_status: z
    .enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"], {
      error: "order_status debe ser PENDING, PROCESSING, SHIPPED, DELIVERED o CANCELLED"
    })
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

export type FilterOrderDTOType = z.infer<typeof FilterOrderDTO>;

// ─── RESPONSE ────────────────────────────────────────────────────
export class OrderItemResponseDTO {
  id_order_item: number;
  fk_product: number;
  quantity: number;
  subtotal: number;

  constructor(data: any) {
    this.id_order_item = data.id_order_item;
    this.fk_product = data.fk_product;
    this.quantity = data.quantity;
    this.subtotal = Number(data.subtotal);
  }
}

export class OrderResponseDTO extends BaseResponseDTO {
  id_order: number;
  fk_user: number;
  fk_address: number;
  fk_wishlist: number;
  total: number;
  order_status: string;
  notes: string | null;
  order_items: OrderItemResponseDTO[];

  constructor(data: any) {
    super({
      id: data.id_order,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id_order = data.id_order;
    this.fk_user = data.fk_user;
    this.fk_address = data.fk_address;
    this.fk_wishlist = data.fk_wishlist;
    this.total = Number(data.total);
    this.order_status = data.order_status;
    this.notes = data.notes ?? null;
    this.order_items = data.order_items?.map((i: any) => new OrderItemResponseDTO(i)) ?? [];
  }

  static map(data: any): OrderResponseDTO {
    return new OrderResponseDTO(data);
  }

  static mapList(data: any[]): OrderResponseDTO[] {
    return data.map(OrderResponseDTO.map);
  }
}
