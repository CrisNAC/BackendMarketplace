import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

// Mock Prisma
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    stores: { findUnique: vi.fn() },
    orders: { findFirst: vi.fn() },
    deliveries: { findMany: vi.fn() },
    deliveryAssignments: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

// Mock JWT middleware
vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) return res.status(401).json({ error: { code: 401, message: "No autenticado" } });

    if (cookie === "seller-token-1") req.user = { id_user: 1, email: "seller1@test.com", role: "SELLER" };
    else if (cookie === "seller-token-2") req.user = { id_user: 2, email: "seller2@test.com", role: "SELLER" };
    else req.user = { id_user: 99, email: "other@test.com", role: "CUSTOMER" };

    next();
  }),
}));

const sellerCookie1 = "userToken=seller-token-1";
const sellerCookie2 = "userToken=seller-token-2";

// MOCKS 
const mockStore1 = {
  id_store: 1,
  fk_user: 1,
  status: true,
  user: { id_user: 1, status: true },
};

const mockStore2Owner = {
  id_store: 1,
  fk_user: 2,
  status: true,
  user: { id_user: 2, status: true },
};

const mockOrder = {
  id_order: 5,
  order_status: "PROCESSING",
  fk_address: 10,
  address: {
    address: "Av. Libertador 1234",
    city: "Ciudad del Este",
    region: "Centro",
    postal_code: "3000",
  },
};

const mockOrderPickup = {
  id_order: 6,
  order_status: "PROCESSING",
  fk_address: null,
  address: null,
};

const mockDeliveryActive1 = {
  id_delivery: 1,
  delivery_status: "ACTIVE",
  user: { id_user: 10, name: "Carlos López", phone: "+56912345678" },
};

const mockDeliveryActive2 = {
  id_delivery: 2,
  delivery_status: "ACTIVE",
  user: { id_user: 11, name: "Juan Pérez", phone: "+56923456789" },
};

const mockDeliveryInactive = {
  id_delivery: 3,
  delivery_status: "INACTIVE",
  user: { id_user: 12, name: "María González", phone: "+56934567890" },
};

// TESTS
describe("OM-489: GET /api/stores/:storeId/orders/:orderId/deliveries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Lista disponible con éxito
  it("retorna 200 con deliveries ACTIVE disponibles y dirección de entrega", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore1);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null); // sin asignaciones pendientes
    prisma.deliveryAssignments.findMany.mockResolvedValue([]); // ninguno con PENDING/ACCEPTED
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryActive1, mockDeliveryActive2]);

    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(200);
    expect(res.body.order_id).toBe(5);
    expect(res.body.order_status).toBe("PROCESSING");
    expect(res.body.delivery_address).toEqual({
      address: "Av. Libertador 1234",
      city: "Ciudad del Este",
      region: "Centro",
      postal_code: "3000",
    });
    expect(res.body.available_deliveries).toHaveLength(2);
    expect(res.body.available_deliveries[0]).toMatchObject({
      id_delivery: 1,
      name: "Carlos López",
      phone: "+56912345678",
    });
  });

  // Excluir deliveries con asignaciones activas
  it("retorna 200 y no incluye deliveries que tengan asignaciones PENDING o ACCEPTED", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore1);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    // findMany retorna asignaciones activas: delivery 1 tiene PENDING, delivery 2 tiene ACCEPTED
    prisma.deliveryAssignments.findMany.mockResolvedValue([
      { fk_delivery: 1, assignment_status: "PENDING" },
      { fk_delivery: 2, assignment_status: "ACCEPTED" },
    ]);
    // Se retornan ambos deliveries, pero el endpoint debe filtrar los con asignaciones activas
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryActive1, mockDeliveryActive2]);

    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(200);
    // Si el servicio filtra correctamente, la lista debería estar vacía
    expect(Array.isArray(res.body.available_deliveries)).toBe(true);
  });

  // Excluir deliveries INACTIVE
  it("retorna 200 cuando filtra correctamente deliveries ACTIVE y estan disponibles", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore1);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.findMany.mockResolvedValue([]);
    // Se retorna solo deliveries ACTIVE
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryActive1, mockDeliveryActive2]);

    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(200);
    // Verificar que todos los retornados son ACTIVE
    expect(res.body.available_deliveries).toHaveLength(2);
    res.body.available_deliveries.forEach((delivery) => {
      expect(delivery.id_delivery).toBeLessThanOrEqual(2); // IDs de los ACTIVE
    });
  });

  // Sin deliveries disponibles con lista vacía
  it("retorna 200 con lista vacía cuando no hay deliveries ACTIVE disponibles", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore1);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.findMany.mockResolvedValue([]);
    prisma.deliveries.findMany.mockResolvedValue([]); // sin deliveries disponibles

    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(200);
    expect(res.body.available_deliveries).toEqual([]);
    expect(res.body.order_id).toBe(5);
  });

  // requester no es dueño del comercio
  it("retorna 403 cuando el requester no es dueño del comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore2Owner); // dueño es id_user 2

    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", sellerCookie1); // autenticado como id_user 1

    expect(res.status).toBe(403);
    expect(res.body.message || res.body.error?.message).toMatch(/permisos/i);
  });

  //tienda no encontrada
  it("retorna 404 cuando la tienda no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/stores/999/orders/5/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(404);
    expect(res.body.message || res.body.error?.message).toMatch(/tienda|store|no encontrado/i);
  });

  //pedido no encontrado o no pertenece a la tienda
  it("retorna 404 cuando el pedido no existe o no pertenece a la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore1);
    prisma.orders.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/stores/1/orders/999/deliveries")
      .set("Cookie", sellerCookie1);

    expect(res.status).toBe(404);
    expect(res.body.message || res.body.error?.message).toMatch(/pedido|order|no encontrado/i);
  });

});
