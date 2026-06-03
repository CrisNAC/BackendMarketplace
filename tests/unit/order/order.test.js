import { vi, describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../../src/lib/prisma.js";
import {
  createOrderService,
  getOrdersService,
  getStoreOrdersService,
  updateOrderStatusService,
} from "../../../src/modules/users/orders/order.service.js";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../../../src/lib/errors.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    carts: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    addresses: { findFirst: vi.fn() },
    orders: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), count: vi.fn(), update: vi.fn() },
    products: { update: vi.fn() },
    orderItems: { createMany: vi.fn(), findMany: vi.fn() },
    stores: { findFirst: vi.fn() },
    shippingZones: { findFirst: vi.fn() },
    users: { findFirst: vi.fn() },
    deliveries: { findFirst: vi.fn() },
    deliveryAssignments: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn() },
    notifications: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockProductNormal = { id_product: 1, price: 100, offer_price: null, is_offer: false, status: true, visible: true, quantity: 10 };
const mockProductOffer = { id_product: 2, price: 100, offer_price: 80, is_offer: true, status: true, visible: true, quantity: 10 };
const mockProductUnavailable = { id_product: 3, price: 50, offer_price: null, is_offer: false, status: false, visible: true };
const mockCart = { id_cart: 1, fk_store: 10, order: null, items: [{ fk_product: 1, quantity: 2, product: mockProductNormal }] };
const mockAddress = { id_address: 1, fk_user: 1, status: true, latitude: -25.28, longitude: -57.63 };
const mockOrderFromDB = {
  id_order: 100,
  order_status: "PENDING",
  total: 200,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  address: null,
  order_items: [{ id_order_item: 1, quantity: 2, price: 100, original_price: 100, is_offer_applied: false, subtotal: 200 }],
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const createMockTx = (overrides = {}) => ({
  orders: { create: vi.fn().mockResolvedValue({ id_order: 100 }), findUnique: vi.fn().mockResolvedValue(mockOrderFromDB), update: vi.fn().mockResolvedValue(mockOrderFromDB) },
  orderItems: { createMany: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
  carts: { updateMany: vi.fn().mockResolvedValue({}), update: vi.fn().mockResolvedValue({}) },
  products: { update: vi.fn().mockResolvedValue({}) },
  notifications: { create: vi.fn().mockResolvedValue({}) },
  deliveries: { findFirst: vi.fn() },
  deliveryAssignments: { findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
  ...overrides,
});

// ─── createOrderService ───────────────────────────────────────────────────────

describe("createOrderService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando el carrito no existe", async () => {
    prisma.carts.findFirst.mockResolvedValue(null);
    await expect(createOrderService(1, { cartId: 99, addressId: null, notes: null })).rejects.toThrow(NotFoundError);
  });

  it("lanza ConflictError cuando el carrito ya fue convertido en pedido", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, order: { id_order: 50 } });
    await expect(createOrderService(1, { cartId: 1, addressId: null, notes: null })).rejects.toThrow(ConflictError);
  });

  it("lanza ValidationError cuando el carrito no tiene items", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, items: [] });
    await expect(createOrderService(1, { cartId: 1, addressId: null, notes: null })).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando hay productos no disponibles", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, items: [{ fk_product: 3, quantity: 1, product: mockProductUnavailable }] });
    await expect(createOrderService(1, { cartId: 1, addressId: null, notes: null })).rejects.toThrow(ValidationError);
  });

  it("crea orden correctamente — valida que createMany reciba price sin oferta (100) y subtotal correcto (300)", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, items: [{ fk_product: 1, quantity: 3, product: mockProductNormal }] });
    
    const mockTx = createMockTx();
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createOrderService(1, { cartId: 1, addressId: null, notes: null });

    const createManyCall = mockTx.orderItems.createMany.mock.calls[0];
    expect(createManyCall[0].data[0]).toMatchObject({
      fk_product: 1,
      quantity: 3,
      price: 100,
      original_price: 100,
      is_offer_applied: false,
      subtotal: 300,
    });
  });

  it("crea orden correctamente — valida que createMany reciba price con oferta (80) y subtotal correcto (160)", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, items: [{ fk_product: 2, quantity: 2, product: mockProductOffer }] });
    
    const mockTx = createMockTx();
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createOrderService(1, { cartId: 1, addressId: null, notes: null });

    const createManyCall = mockTx.orderItems.createMany.mock.calls[0];
    expect(createManyCall[0].data[0]).toMatchObject({
      fk_product: 2,
      quantity: 2,
      price: 80,
      original_price: 100,
      is_offer_applied: true,
      subtotal: 160,
    });
  });

  it("marca carritos previos como ABANDONED y el actual como CHECKED_OUT", async () => {
    prisma.carts.findFirst.mockResolvedValue(mockCart);
    
    const mockTx = createMockTx();
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    await createOrderService(1, { cartId: 1, addressId: null, notes: null });

    expect(mockTx.carts.updateMany).toHaveBeenCalledWith({
      where: { fk_user: 1, fk_store: 10, cart_status: "CHECKED_OUT" },
      data: { cart_status: "ABANDONED" },
    });
    expect(mockTx.carts.update).toHaveBeenCalledWith({
      where: { id_cart: 1 },
      data: { cart_status: "CHECKED_OUT" },
    });
  });
});

// ─── getOrdersService ─────────────────────────────────────────────────────────

describe("getOrdersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna pedidos sin consultar tiendas para CUSTOMER", async () => {
    prisma.orders.findMany.mockResolvedValue([mockOrderFromDB]);
    const result = await getOrdersService(1, 1);
    expect(prisma.stores.findFirst).not.toHaveBeenCalled();
    expect(result[0].id).toBe(100);
  });

  it("filtra por tienda cuando SELLER consulta", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.orders.findMany.mockResolvedValue([mockOrderFromDB]);
    await getOrdersService(2, 1);
    expect(prisma.orders.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ fk_store: 10 }) }));
  });

  it("lanza ForbiddenError cuando SELLER no tiene tienda común", async () => {
    prisma.stores.findFirst.mockResolvedValue(null);
    await expect(getOrdersService(2, 1)).rejects.toThrow(ForbiddenError);
  });
});

// ─── getStoreOrdersService ────────────────────────────────────────────────────

describe("getStoreOrdersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna paginación correcta con total_page calculado", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[mockOrderFromDB], 25]);

    const result = await getStoreOrdersService(1, 10, { page: 1, limit: 10 });

    expect(result).toMatchObject({ total: 25, page: 1, limit: 10, total_page: 3 });
  });

  it("lanza NotFoundError si tienda no existe", async () => {
    prisma.stores.findFirst.mockResolvedValue(null);
    await expect(getStoreOrdersService(1, 99, {})).rejects.toThrow(NotFoundError);
  });
});

// ─── updateOrderStatusService ────────────────────────────────────────────────

describe("updateOrderStatusService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("SELLER PENDING → PROCESSING: actualiza estado y carts.updateMany/update", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "PENDING", fk_store: 10 });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });

    const mockTx = createMockTx({
      orders: { update: vi.fn().mockResolvedValue({ ...mockOrderFromDB, order_status: "PROCESSING" }) },
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    const result = await updateOrderStatusService(1, 100, "PROCESSING");

    expect(result.status).toBe("PROCESSING");
    expect(mockTx.orders.update).toHaveBeenCalled();
  });

  it("SELLER PENDING → CANCELLED: restaura stock (2 productos)", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "PENDING", fk_store: 10 });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });

    const mockTx = createMockTx({
      orders: { update: vi.fn().mockResolvedValue({ ...mockOrderFromDB, order_status: "CANCELLED" }) },
      orderItems: { findMany: vi.fn().mockResolvedValue([{ fk_product: 1, quantity: 2 }, { fk_product: 2, quantity: 1 }]) },
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    const result = await updateOrderStatusService(1, 100, "CANCELLED");

    expect(result.status).toBe("CANCELLED");
    expect(mockTx.products.update).toHaveBeenCalledTimes(2);
  });

  it("CUSTOMER PENDING → CANCELLED: restaura stock (1 producto)", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "CUSTOMER" });
    prisma.orders.findFirst
      .mockResolvedValueOnce({ id_order: 100, order_status: "PENDING", fk_store: 10 })
      .mockResolvedValueOnce({ id_order: 100 });

    const mockTx = createMockTx({
      orders: { update: vi.fn().mockResolvedValue({ ...mockOrderFromDB, order_status: "CANCELLED" }) },
      orderItems: { findMany: vi.fn().mockResolvedValue([{ fk_product: 1, quantity: 2 }]) },
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    const result = await updateOrderStatusService(1, 100, "CANCELLED");

    expect(result.status).toBe("CANCELLED");
    expect(mockTx.products.update).toHaveBeenCalledTimes(1);
  });

  it("DELIVERY SHIPPED → DELIVERED: transición permitida", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "DELIVERY" });
    prisma.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "SHIPPED", fk_store: 10 });
    prisma.deliveryAssignments.findFirst.mockResolvedValue({ id_delivery_assignment: 1 });

    const mockTx = createMockTx({
      orders: { update: vi.fn().mockResolvedValue({ ...mockOrderFromDB, order_status: "DELIVERED" }) },
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(mockTx));

    const result = await updateOrderStatusService(1, 100, "DELIVERED");

    expect(result.status).toBe("DELIVERED");
  });

  it("DELIVERY SHIPPED → DELIVERED: lanza ForbiddenError si no es el delivery asignado", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "DELIVERY" });
    prisma.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "SHIPPED", fk_store: 10 });
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);

    await expect(updateOrderStatusService(1, 100, "DELIVERED")).rejects.toThrow(ForbiddenError);
  });

  it("SELLER SHIPPED → DELIVERED: transición NO permitida", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({ id_order: 100, order_status: "SHIPPED", fk_store: 10 });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });

    await expect(updateOrderStatusService(1, 100, "DELIVERED")).rejects.toThrow(ValidationError);
  });

  it("CUSTOMER PROCESSING → CANCELLED: NO permitida", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "CUSTOMER" });
    prisma.orders.findFirst
      .mockResolvedValueOnce({ id_order: 100, order_status: "PROCESSING", fk_store: 10 })
      .mockResolvedValueOnce({ id_order: 100 });

    await expect(updateOrderStatusService(1, 100, "CANCELLED")).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError si usuario no existe", async () => {
    prisma.users.findFirst.mockResolvedValue(null);
    await expect(updateOrderStatusService(1, 100, "PROCESSING")).rejects.toThrow(NotFoundError);
  });
});