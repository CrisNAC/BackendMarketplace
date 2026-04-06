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
    carts: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    addresses: {
      findFirst: vi.fn(),
    },
    orders: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    orderItems: {
      createMany: vi.fn(),
    },
    stores: {
      findFirst: vi.fn(),
    },
    users: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockProductNormal = {
  id_product: 1,
  price: 100,
  offer_price: null,
  is_offer: false,
  status: true,
  visible: true,
};

const mockProductOffer = {
  id_product: 2,
  price: 100,
  offer_price: 80,
  is_offer: true,
  status: true,
  visible: true,
};

const mockProductUnavailable = {
  id_product: 3,
  price: 50,
  offer_price: null,
  is_offer: false,
  status: false,  // producto inactivo
  visible: true,
};

const mockCart = {
  id_cart: 1,
  fk_store: 10,
  order: null,
  items: [
    { fk_product: 1, quantity: 2, product: mockProductNormal },
  ],
};

const mockAddress = { id_address: 1, fk_user: 1, status: true };

const mockOrderFromDB = {
  id_order: 100,
  order_status: "PENDING",
  total: 200,
  notes: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  address: null,
  order_items: [
    {
      id_order_item: 1,
      quantity: 2,
      price: 100,
      original_price: 100,
      is_offer_applied: false,
      subtotal: 200,
    },
  ],
};

// ─── createOrderService ───────────────────────────────────────────────────────

describe("createOrderService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando el carrito no existe", async () => {
    prisma.carts.findFirst.mockResolvedValue(null);

    await expect(
      createOrderService(1, { cartId: 99, addressId: null, notes: null, total: 200 })
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza ConflictError cuando el carrito ya fue convertido en pedido", async () => {
    prisma.carts.findFirst.mockResolvedValue({
      ...mockCart,
      order: { id_order: 50 }, // ya tiene pedido
    });

    await expect(
      createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 200 })
    ).rejects.toThrow(ConflictError);
  });

  it("lanza ValidationError cuando el carrito no tiene items", async () => {
    prisma.carts.findFirst.mockResolvedValue({ ...mockCart, items: [] });

    await expect(
      createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 200 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando hay productos no disponibles", async () => {
    prisma.carts.findFirst.mockResolvedValue({
      ...mockCart,
      items: [{ fk_product: 3, quantity: 1, product: mockProductUnavailable }],
    });

    await expect(
      createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 50 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando hay productos no visibles", async () => {
    prisma.carts.findFirst.mockResolvedValue({
      ...mockCart,
      items: [
        {
          fk_product: 4,
          quantity: 1,
          product: { ...mockProductNormal, visible: false },
        },
      ],
    });

    await expect(
      createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 100 })
    ).rejects.toThrow(ValidationError);
  });

  it("lanza NotFoundError cuando la dirección no existe o no pertenece al usuario", async () => {
    prisma.carts.findFirst.mockResolvedValue(mockCart);
    prisma.addresses.findFirst.mockResolvedValue(null);

    await expect(
      createOrderService(1, { cartId: 1, addressId: 99, notes: null, total: 200 })
    ).rejects.toThrow(NotFoundError);
  });

  it("crea la orden correctamente con dirección válida", async () => {
    prisma.carts.findFirst.mockResolvedValue(mockCart);
    prisma.addresses.findFirst.mockResolvedValue(mockAddress);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.orders.create.mockResolvedValue({ id_order: 100 });
    prisma.orderItems.createMany.mockResolvedValue({});
    prisma.carts.update.mockResolvedValue({});
    prisma.orders.findUnique.mockResolvedValue(mockOrderFromDB);

    const result = await createOrderService(1, {
      cartId: 1,
      addressId: 1,
      notes: "entregar en la mañana",
      total: 200,
    });

    expect(result).toMatchObject({
      id: 100,
      status: "PENDING",
      total: 200,
    });
  });

  it("crea la orden sin dirección (retiro en tienda)", async () => {
    prisma.carts.findFirst.mockResolvedValue(mockCart);
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.orders.create.mockResolvedValue({ id_order: 100 });
    prisma.orderItems.createMany.mockResolvedValue({});
    prisma.carts.update.mockResolvedValue({});
    prisma.orders.findUnique.mockResolvedValue(mockOrderFromDB);

    const result = await createOrderService(1, {
      cartId: 1,
      addressId: null,
      notes: null,
      total: 200,
    });

    expect(result.id).toBe(100);
    // No debe haber consultado direcciones
    expect(prisma.addresses.findFirst).not.toHaveBeenCalled();
  });

  // ─── Cálculo de precios históricos ───────────────────────────────────────

  it("calcula precio sin oferta correctamente (price normal)", async () => {
    prisma.carts.findFirst.mockResolvedValue({
      ...mockCart,
      items: [{ fk_product: 1, quantity: 3, product: mockProductNormal }],
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.orders.create.mockResolvedValue({ id_order: 100 });
    prisma.orderItems.createMany.mockResolvedValue({});
    prisma.carts.update.mockResolvedValue({});
    prisma.orders.findUnique.mockResolvedValue(mockOrderFromDB);

    await createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 300 });

    const itemsCreated = prisma.orderItems.createMany.mock.calls[0][0].data;
    expect(itemsCreated[0]).toMatchObject({
      fk_product: 1,
      quantity: 3,
      price: 100,           // price normal
      original_price: 100,
      is_offer_applied: false,
      subtotal: 300,        // 100 * 3
    });
  });

  it("calcula precio con oferta correctamente (usa offer_price)", async () => {
    prisma.carts.findFirst.mockResolvedValue({
      ...mockCart,
      items: [{ fk_product: 2, quantity: 2, product: mockProductOffer }],
    });
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    prisma.orders.create.mockResolvedValue({ id_order: 100 });
    prisma.orderItems.createMany.mockResolvedValue({});
    prisma.carts.update.mockResolvedValue({});
    prisma.orders.findUnique.mockResolvedValue(mockOrderFromDB);

    await createOrderService(1, { cartId: 1, addressId: null, notes: null, total: 160 });

    const itemsCreated = prisma.orderItems.createMany.mock.calls[0][0].data;
    expect(itemsCreated[0]).toMatchObject({
      fk_product: 2,
      quantity: 2,
      price: 80,            // offer_price
      original_price: 100,  // price original
      is_offer_applied: true,
      subtotal: 160,        // 80 * 2
    });
  });

  it("lanza ValidationError cuando cartId no es un entero positivo", async () => {
    await expect(
      createOrderService(1, { cartId: -1, addressId: null, notes: null, total: 100 })
    ).rejects.toThrow(ValidationError);
  });
});

// ─── getOrdersService ─────────────────────────────────────────────────────────

describe("getOrdersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna los pedidos del propio usuario sin consultar tiendas", async () => {
    prisma.orders.findMany.mockResolvedValue([mockOrderFromDB]);

    const result = await getOrdersService(1, 1); // mismo usuario

    expect(prisma.stores.findFirst).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(100);
  });

  it("lanza ForbiddenError cuando un SELLER intenta ver pedidos de otro cliente sin tienda en común", async () => {
    prisma.stores.findFirst.mockResolvedValue(null);

    await expect(getOrdersService(2, 1)).rejects.toThrow(ForbiddenError);
  });

  it("retorna pedidos filtrados por tienda cuando el SELLER tiene permisos", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.orders.findMany.mockResolvedValue([mockOrderFromDB]);

    const result = await getOrdersService(2, 1); // seller 2 ve pedidos del cliente 1

    expect(prisma.orders.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ fk_store: 10 }),
      })
    );
    expect(result).toHaveLength(1);
  });

  it("retorna array vacío cuando el usuario no tiene pedidos", async () => {
    prisma.orders.findMany.mockResolvedValue([]);

    const result = await getOrdersService(1, 1);

    expect(result).toEqual([]);
  });

  it("mapea correctamente los campos del pedido", async () => {
    prisma.orders.findMany.mockResolvedValue([mockOrderFromDB]);

    const result = await getOrdersService(1, 1);
    const order = result[0];

    expect(order).toMatchObject({
      id: 100,
      status: "PENDING",
      total: 200,
      notes: null,
      address: null,
    });
    expect(Array.isArray(order.items)).toBe(true);
  });
});

// ─── getStoreOrdersService ────────────────────────────────────────────────────

describe("getStoreOrdersService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando la tienda no existe o no pertenece al usuario", async () => {
    prisma.stores.findFirst.mockResolvedValue(null);

    await expect(getStoreOrdersService(1, 99, {})).rejects.toThrow(NotFoundError);
  });

  it("retorna pedidos con estructura de paginación correcta", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[mockOrderFromDB], 1]);

    const result = await getStoreOrdersService(1, 10, { page: 1, limit: 10 });

    expect(result).toMatchObject({
      total: 1,
      page: 1,
      limit: 10,
      total_page: 1,
    });
    expect(result.orders).toHaveLength(1);
  });

  it("aplica filtro por order_status correctamente", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[mockOrderFromDB], 1]);

    await getStoreOrdersService(1, 10, { order_status: "PENDING" });

    const [findManyCall] = prisma.$transaction.mock.calls[0][0];
    // verificamos que la transacción fue llamada
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("aplica filtro por múltiples estados separados por coma", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[], 0]);

    await getStoreOrdersService(1, 10, { order_status: "PENDING,PROCESSING" });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("aplica filtro por rango de fechas", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[], 0]);

    await getStoreOrdersService(1, 10, {
      date_from: "2026-01-01",
      date_to: "2026-12-31",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("calcula total_page correctamente", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[mockOrderFromDB], 25]);

    const result = await getStoreOrdersService(1, 10, { page: 1, limit: 10 });

    expect(result.total_page).toBe(3); // ceil(25/10)
  });

  it("usa valores por defecto page=1 y limit=10 cuando no se envían", async () => {
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.$transaction.mockResolvedValue([[], 0]);

    const result = await getStoreOrdersService(1, 10, {});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
  });
});

// ─── updateOrderStatusService ────────────────────────────────────────────────

describe("updateOrderStatusService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lanza NotFoundError cuando el usuario no existe", async () => {
    prisma.users.findFirst.mockResolvedValue(null);

    await expect(
      updateOrderStatusService(1, 100, "PROCESSING")
    ).rejects.toThrow(NotFoundError);
  });

  it("lanza NotFoundError cuando el pedido no existe", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue(null);

    await expect(
      updateOrderStatusService(1, 999, "PROCESSING")
    ).rejects.toThrow(NotFoundError);
  });

  // ─── SELLER ──────────────────────────────────────────────────────────────

  it("lanza ForbiddenError cuando el SELLER intenta modificar un pedido de otra tienda", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PENDING",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue(null); // no es su tienda

    await expect(
      updateOrderStatusService(2, 100, "PROCESSING")
    ).rejects.toThrow(ForbiddenError);
  });

  it("SELLER puede pasar de PENDING a PROCESSING", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PENDING",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.orders.update.mockResolvedValue(mockOrderFromDB);

    await updateOrderStatusService(1, 100, "PROCESSING");

    expect(prisma.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { order_status: "PROCESSING" } })
    );
  });

  it("SELLER puede pasar de PENDING a CANCELLED", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PENDING",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.orders.update.mockResolvedValue(mockOrderFromDB);

    await updateOrderStatusService(1, 100, "CANCELLED");

    expect(prisma.orders.update).toHaveBeenCalled();
  });

  it("SELLER puede pasar de PROCESSING a SHIPPED", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PROCESSING",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });
    prisma.orders.update.mockResolvedValue(mockOrderFromDB);

    await updateOrderStatusService(1, 100, "SHIPPED");

    expect(prisma.orders.update).toHaveBeenCalled();
  });

  it("lanza ValidationError cuando el SELLER intenta una transición inválida (SHIPPED → DELIVERED)", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "SHIPPED",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });

    await expect(
      updateOrderStatusService(1, 100, "DELIVERED")
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ValidationError cuando el SELLER intenta modificar un pedido ya CANCELLED", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "SELLER" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "CANCELLED",
      fk_store: 10,
    });
    prisma.stores.findFirst.mockResolvedValue({ id_store: 10 });

    await expect(
      updateOrderStatusService(1, 100, "PROCESSING")
    ).rejects.toThrow(ValidationError);
  });

  // ─── DELIVERY ─────────────────────────────────────────────────────────────

  it("DELIVERY puede pasar de SHIPPED a DELIVERED", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "DELIVERY" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "SHIPPED",
      fk_store: 10,
    });
    prisma.orders.update.mockResolvedValue(mockOrderFromDB);

    await updateOrderStatusService(1, 100, "DELIVERED");

    expect(prisma.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { order_status: "DELIVERED" } })
    );
  });

  it("lanza ValidationError cuando DELIVERY intenta una transición inválida (PENDING → DELIVERED)", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "DELIVERY" });
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PENDING",
      fk_store: 10,
    });

    await expect(
      updateOrderStatusService(1, 100, "DELIVERED")
    ).rejects.toThrow(ValidationError);
  });

  // ─── CUSTOMER ─────────────────────────────────────────────────────────────

  it("lanza ForbiddenError cuando el CUSTOMER intenta modificar un pedido ajeno", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "CUSTOMER" });
    prisma.orders.findFirst
      .mockResolvedValueOnce({ id_order: 100, order_status: "PENDING", fk_store: 10 })
      .mockResolvedValueOnce(null); // el pedido no le pertenece

    await expect(
      updateOrderStatusService(2, 100, "CANCELLED")
    ).rejects.toThrow(ForbiddenError);
  });

  it("CUSTOMER puede cancelar su pedido cuando está en PENDING", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "CUSTOMER" });
    prisma.orders.findFirst
      .mockResolvedValueOnce({ id_order: 100, order_status: "PENDING", fk_store: 10 })
      .mockResolvedValueOnce({ id_order: 100 }); // es su pedido
    prisma.orders.update.mockResolvedValue(mockOrderFromDB);

    await updateOrderStatusService(1, 100, "CANCELLED");

    expect(prisma.orders.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { order_status: "CANCELLED" } })
    );
  });

  it("lanza ValidationError cuando el CUSTOMER intenta cancelar un pedido en PROCESSING", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "CUSTOMER" });
    prisma.orders.findFirst
      .mockResolvedValueOnce({ id_order: 100, order_status: "PROCESSING", fk_store: 10 })
      .mockResolvedValueOnce({ id_order: 100 });

    await expect(
      updateOrderStatusService(1, 100, "CANCELLED")
    ).rejects.toThrow(ValidationError);
  });

  it("lanza ForbiddenError cuando el rol no tiene transiciones definidas (ej: rol desconocido)", async () => {
    prisma.users.findFirst.mockResolvedValue({ role: "ADMIN" }); // rol sin transiciones
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "PENDING",
      fk_store: 10,
    });

    await expect(
      updateOrderStatusService(1, 100, "PROCESSING")
    ).rejects.toThrow(ForbiddenError);
  });
});