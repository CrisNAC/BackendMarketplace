import { describe, it, expect } from "vitest";
import {
  CreateOrderDTO,
  UpdateOrderDTO,
  FilterOrderDTO,
  OrderResponseDTO,
  OrderItemResponseDTO,
} from "../../../src/modules/global/dtos/orders/order.dto.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

const validItem = { fk_product: 1, quantity: 2 };

const validOrderData = {
  id_order: 10,
  fk_user: 1,
  fk_address: 3,
  fk_cart: 5,
  total: "25000.00",
  order_status: "PENDING",
  notes: "Sin cebollas",
  order_items: [
    { id_order_item: 1, fk_product: 1, quantity: 2, subtotal: "10000.00" },
    { id_order_item: 2, fk_product: 2, quantity: 1, subtotal: "15000.00" },
  ],
  created_at: NOW,
  updated_at: NOW,
};

// ─── CreateOrderDTO ──────────────────────────────────────────────────────────

describe("CreateOrderDTO", () => {
  it("acepta datos válidos con items", () => {
    const result = CreateOrderDTO.safeParse({
      fk_cart: 5,
      fk_wishlist: 2,
      items: [validItem],
    });
    expect(result.success).toBe(true);
  });

  it("acepta datos completos con notes", () => {
    const result = CreateOrderDTO.safeParse({
      fk_cart: 5,
      fk_wishlist: 2,
      notes: "Sin cebollas",
      items: [validItem, { fk_product: 2, quantity: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it("falla cuando falta fk_cart", () => {
    const result = CreateOrderDTO.safeParse({ fk_wishlist: 1, items: [validItem] });
    expect(result.success).toBe(false);
  });

  it("falla cuando items está vacío", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, items: [] });
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un producto"))).toBe(true);
  });

  it("falla cuando quantity es 0", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, items: [{ fk_product: 1, quantity: 0 }] });
    expect(result.success).toBe(false);
  });

  it("falla cuando quantity es negativo", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, items: [{ fk_product: 1, quantity: -1 }] });
    expect(result.success).toBe(false);
  });

  it("falla cuando fk_product no es entero positivo", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, items: [{ fk_product: -1, quantity: 1 }] });
    expect(result.success).toBe(false);
  });

  it("acepta notes null", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, notes: null, items: [validItem] });
    expect(result.success).toBe(true);
  });

  it("falla cuando notes supera 2000 caracteres", () => {
    const result = CreateOrderDTO.safeParse({ fk_cart: 1, fk_wishlist: 1, items: [validItem], notes: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });
});

// ─── UpdateOrderDTO ──────────────────────────────────────────────────────────

describe("UpdateOrderDTO", () => {
  it("acepta actualización parcial con solo order_status", () => {
    const result = UpdateOrderDTO.safeParse({ order_status: "PROCESSING" });
    expect(result.success).toBe(true);
  });

  it("acepta todos los order_status válidos", () => {
    for (const status of ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]) {
      const result = UpdateOrderDTO.safeParse({ order_status: status });
      expect(result.success).toBe(true);
    }
  });

  it("falla con order_status inválido", () => {
    const result = UpdateOrderDTO.safeParse({ order_status: "RETURNED" });
    expect(result.success).toBe(false);
  });

  it("falla cuando no se envía ningún campo", () => {
    const result = UpdateOrderDTO.safeParse({});
    expect(result.success).toBe(false);
    const messages = result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("al menos un campo"))).toBe(true);
  });

  it("acepta fk_address válido", () => {
    const result = UpdateOrderDTO.safeParse({ fk_address: 5 });
    expect(result.success).toBe(true);
  });

  it("acepta notes null", () => {
    const result = UpdateOrderDTO.safeParse({ notes: null });
    expect(result.success).toBe(true);
  });
});

// ─── FilterOrderDTO ──────────────────────────────────────────────────────────

describe("FilterOrderDTO", () => {
  it("acepta objeto vacío con defaults", () => {
    const result = FilterOrderDTO.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(1);
    expect(result.data.limit).toBe(10);
  });

  it("transforma fk_user de string a número", () => {
    const result = FilterOrderDTO.safeParse({ fk_user: "1" });
    expect(result.success).toBe(true);
    expect(result.data.fk_user).toBe(1);
  });

  it("filtra por order_status válido", () => {
    const result = FilterOrderDTO.safeParse({ order_status: "DELIVERED" });
    expect(result.success).toBe(true);
  });

  it("falla con order_status inválido", () => {
    const result = FilterOrderDTO.safeParse({ order_status: "UNKNOWN" });
    expect(result.success).toBe(false);
  });

  it("transforma page y limit de string a número", () => {
    const result = FilterOrderDTO.safeParse({ page: "3", limit: "5" });
    expect(result.success).toBe(true);
    expect(result.data.page).toBe(3);
    expect(result.data.limit).toBe(5);
  });

  it("falla con limit mayor a 100", () => {
    const result = FilterOrderDTO.safeParse({ limit: "101" });
    expect(result.success).toBe(false);
  });
});

// ─── OrderItemResponseDTO ────────────────────────────────────────────────────

describe("OrderItemResponseDTO", () => {
  it("mapea todos los campos correctamente", () => {
    const dto = new OrderItemResponseDTO({ id_order_item: 1, fk_product: 2, quantity: 3, subtotal: "15000.00" });
    expect(dto.id_order_item).toBe(1);
    expect(dto.fk_product).toBe(2);
    expect(dto.quantity).toBe(3);
    expect(dto.subtotal).toBe(15000);
    expect(typeof dto.subtotal).toBe("number");
  });
});

// ─── OrderResponseDTO ────────────────────────────────────────────────────────

describe("OrderResponseDTO", () => {
  it("mapea todos los campos correctamente", () => {
    const dto = new OrderResponseDTO(validOrderData);
    expect(dto.id_order).toBe(10);
    expect(dto.fk_user).toBe(1);
    expect(dto.fk_address).toBe(3);
    expect(dto.fk_cart).toBe(5);
    expect(dto.total).toBe(25000);
    expect(typeof dto.total).toBe("number");
    expect(dto.order_status).toBe("PENDING");
    expect(dto.notes).toBe("Sin cebollas");
    expect(dto.id).toBe(10);
    expect(dto.created_at).toBe(NOW);
  });

  it("notes es null cuando no se provee", () => {
    const dto = new OrderResponseDTO({ ...validOrderData, notes: undefined });
    expect(dto.notes).toBeNull();
  });

  it("mapea order_items como array de OrderItemResponseDTO", () => {
    const dto = new OrderResponseDTO(validOrderData);
    expect(dto.order_items).toHaveLength(2);
    expect(dto.order_items[0]).toBeInstanceOf(OrderItemResponseDTO);
    expect(dto.order_items[0].subtotal).toBe(10000);
  });

  it("order_items es array vacío cuando no hay items", () => {
    const dto = new OrderResponseDTO({ ...validOrderData, order_items: undefined });
    expect(dto.order_items).toEqual([]);
  });

  it("static map() retorna instancia de OrderResponseDTO", () => {
    const dto = OrderResponseDTO.map(validOrderData);
    expect(dto).toBeInstanceOf(OrderResponseDTO);
  });

  it("static mapList() retorna array mapeado", () => {
    const list = OrderResponseDTO.mapList([validOrderData, { ...validOrderData, id_order: 11 }]);
    expect(list).toHaveLength(2);
    expect(list[1].id_order).toBe(11);
  });
});