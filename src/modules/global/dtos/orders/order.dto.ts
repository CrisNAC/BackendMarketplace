import { z } from "zod";
import { BaseResponseDTO } from "../base/base.response.dto";

const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const; //ESTADOS

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

  fk_cart: z
    .number({ error: "fk_cart es requerido" })
    .int()
    .positive("fk_cart debe ser ID valido"),

  fk_address: z
    .number({ error: "fk_address es requerido" })
    .int()
    .positive("fk_address debe ser un ID válido"),

  notes: z
    .string()
    .max(2000, "notes no puede superar 2000 caracteres")
    .nullable()
    .optional()
});

export type CreateOrderDTOType = z.infer<typeof CreateOrderDTO>;

export const UpdateOrderDTO = z
  .object({
    order_status: z
      .enum(ORDER_STATUSES, {
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
    .enum(ORDER_STATUSES, {
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
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number;           // precio final cobrado
  originalPrice: number;   // precio sin oferta
  isOfferApplied: boolean;
  subtotal: number;

  constructor(data: any) {
    this.id = data.id_order_item;
    this.productId = data.product.id_product;
    this.productName = data.product.name;
    this.quantity = data.quantity;
    this.price = Number(data.price);
    this.originalPrice = Number(data.original_price);
    this.isOfferApplied = data.is_offer_applied;
    this.subtotal = Number(data.subtotal);
  }
}

export class OrderResponseDTO extends BaseResponseDTO {
  id: number;
  userId: number;
  storeId: number;
  cartId: number;
  total: number;
  orderStatus: string;
  notes: string | null;
  address: {
    id: number;
    address: string;
    city: string;
    region: string;
  };
  items: OrderItemResponseDTO[];

  constructor(data: any) {
    super({
      id: data.id_order,
      created_at: data.created_at,
      updated_at: data.updated_at
    });
    this.id = data.id_order;
    this.userId = data.fk_user;
    this.storeId = data.fk_store;
    this.cartId = data.fk_cart;
    this.total = Number(data.total);
    this.orderStatus = data.order_status;
    this.notes = data.notes ?? null;
    this.address = {
      id: data.address.id_address,
      address: data.address.address,
      city: data.address.city,
      region: data.address.region
    };
    this.items = data.order_items?.map((i: any) => new OrderItemResponseDTO(i)) ?? [];
  }

  static map(data: any): OrderResponseDTO {
    return new OrderResponseDTO(data);
  }

  static mapList(data: any[]): OrderResponseDTO[] {
    return data.map(OrderResponseDTO.map);
  }
}
