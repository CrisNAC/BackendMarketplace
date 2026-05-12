import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";
import { createAssignmentService } from "../../../src/modules/delivery/delivery-assignments/delivery-assignments.service.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findUnique: vi.fn(),
    },
    orders: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    deliveries: {
      findMany: vi.fn(),
      findUnique: vi.fn(), 
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
 
vi.mock("jsonwebtoken", async () => {
  const actual = await vi.importActual("jsonwebtoken");
  return {
    default: {
      ...actual.default,
      verify: vi.fn((token, secret, callback) => {
        callback(null, { id_user: 1, email: "seller@test.com", role: "SELLER" });
      }),
    },
  };
});
 
const authCookie = "userToken=mock-token";
 
const mockStore = {
  id_store: 1,
  fk_user: 1,
  logo: null,
  status: true,
  user: { id_user: 1, status: true },
};
 
const mockOrder = {
  id_order: 5,
  order_status: "PROCESSING",
  fk_address: 10,
  address: {
    address: "Av. Libertador 1234",
    city: "Ciudad del Este",
    region: "Centro",
    postal_code: null,
  },
};
 
const mockDeliveries = [
  {
    id_delivery: 1,
    user: { id_user: 2, name: "Carlos López", phone: "0981234567", avatar_url: null },
  },
  {
    id_delivery: 2,
    user: { id_user: 3, name: "Juan Pérez", phone: "0987654321", avatar_url: null },
  },
];
 
describe("GET /api/stores/:storeId/orders/:orderId/deliveries", () => {
  beforeEach(() => vi.clearAllMocks());
 
  it("devuelve 401 cuando no hay autenticación", async () => {
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries");
 
    expect(res.status).toBe(401);
  });
 
  it("devuelve 403 cuando la tienda no pertenece al usuario autenticado", async () => {
    prisma.stores.findUnique.mockResolvedValue({
      ...mockStore,
      fk_user: 99, // dueño diferente al autenticado (1)
      user: { id_user: 99, status: true },
    });
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permisos/i);
  });
 
  it("devuelve 404 cuando el pedido no existe o no pertenece a la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue(null);
 
    const res = await request(app)
      .get("/api/stores/1/orders/999/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/pedido no encontrado/i);
  });
 
  it("devuelve 400 cuando el pedido no está en estado delegable", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue({
      ...mockOrder,
      order_status: "DELIVERED", // no delegable
    });
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/solo se pueden delegar/i);
  });
 
  it("devuelve 400 cuando el pedido ya tiene una asignación PENDING activa", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
      id_delivery_assignment: 1,
      assignment_status: "PENDING",
      delivery: {
        delivery_status: "ACTIVE" // Delivery activo -> bloquear
      }
    });
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ya tiene una asignación/i);
  });
 
  it("devuelve 200 con lista vacía cuando no hay deliveries ACTIVE", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.findMany.mockResolvedValue([]);
    prisma.deliveries.findMany.mockResolvedValue([]);
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(200);
    expect(res.body.available_deliveries).toEqual([]);
    expect(res.body.order_id).toBe(5);
  });
 
  it("devuelve 200 con deliveries disponibles y dirección de entrega", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue(mockOrder);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.findMany.mockResolvedValue([]);
    prisma.deliveries.findMany.mockResolvedValue(mockDeliveries);
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      order_id: 5,
      order_status: "PROCESSING",
      delivery_address: {
        address: "Av. Libertador 1234",
        city: "Ciudad del Este",
        region: "Centro",
        postal_code: null,
      },
    });
    expect(res.body.available_deliveries).toHaveLength(2);
    expect(res.body.available_deliveries[0]).toMatchObject({
      id_delivery: 1,
      name: "Carlos López",
      phone: "0981234567",
    });
  });
 
  it("devuelve delivery_address null cuando el pedido es pickup", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.orders.findFirst.mockResolvedValue({
      ...mockOrder,
      fk_address: null,
      address: null, // pickup — sin dirección
    });
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);
    prisma.deliveryAssignments.findMany.mockResolvedValue([]);
    prisma.deliveries.findMany.mockResolvedValue(mockDeliveries);
 
    const res = await request(app)
      .get("/api/stores/1/orders/5/deliveries")
      .set("Cookie", authCookie);
 
    expect(res.status).toBe(200);
    expect(res.body.delivery_address).toBeNull();
    expect(res.body.available_deliveries).toHaveLength(2);
  });

  it("rechaza automáticamente la asignación PENDING anterior si delivery está INACTIVE", async () => {
    vi.mocked(prisma.orders.findUnique).mockResolvedValueOnce({
      id_order: 100,
      fk_store: 1
    });
    
    vi.mocked(prisma.deliveries.findUnique).mockResolvedValueOnce({
      id_delivery: 5,
      delivery_status: "ACTIVE",
      status: true
    });

    const mockPendingWithInactiveDelivery = {
      id_delivery_assignment: 10,
      assignment_status: "PENDING",
      delivery: { delivery_status: "INACTIVE" }
    };

    // Mockear $transaction para que ejecute el callback correctamente
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      const tx = {
        deliveryAssignments: {
          findFirst: vi.fn()
            .mockResolvedValueOnce({ assignment_sequence: 1 }) // último sequence
            .mockResolvedValueOnce(mockPendingWithInactiveDelivery), // pending assignment
          update: vi.fn().mockResolvedValueOnce({
            ...mockPendingWithInactiveDelivery,
            assignment_status: "REJECTED"
          }),
          create: vi.fn().mockResolvedValueOnce({
            id_delivery_assignment: 11,
            fk_order: 100,
            fk_delivery: 5,
            assignment_status: "PENDING",
            assignment_sequence: 2
          }),
        },
      };
      return await callback(tx);
    });

    const result = await createAssignmentService({
      fk_order: 100,
      fk_delivery: 5
    });

    expect(result.assignment_status).toBe("PENDING");
    expect(result.assignment_sequence).toBe(2);
  });

  it("lanza error 409 cuando ya hay PENDING con delivery ACTIVE", async () => {
    vi.mocked(prisma.orders.findUnique).mockResolvedValueOnce({
      id_order: 100,
      fk_store: 1
    });
    
    vi.mocked(prisma.deliveries.findUnique).mockResolvedValueOnce({
      id_delivery: 5,
      delivery_status: "ACTIVE",
      status: true
    });

    const mockPendingWithActiveDelivery = {
      id_delivery_assignment: 10,
      assignment_status: "PENDING",
      delivery: { delivery_status: "ACTIVE" }
    };

    // Mockear $transaction para que lance el error
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      const tx = {
        deliveryAssignments: {
          findFirst: vi.fn()
            .mockResolvedValueOnce({ assignment_sequence: 1 }) // último sequence
            .mockResolvedValueOnce(mockPendingWithActiveDelivery), // pending assignment ACTIVE
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      return await callback(tx);
    });

    await expect(
      createAssignmentService({ fk_order: 100, fk_delivery: 5 })
    ).rejects.toMatchObject({
      status: 409,
      message: "Ya hay una asignación pendiente para este pedido"
    });
  });
});