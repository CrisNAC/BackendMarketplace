import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// ─── MOCK DE PRISMA ──────────────────────────────────────────────────────────

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deliveryReviews: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("jsonwebtoken", async () => {
  const actual = await vi.importActual("jsonwebtoken");
  return {
    default: {
      ...actual.default,
      verify: vi.fn((token, secret, callback) => {
        callback(null, { id_user: 1, email: "test@test.com", role: "SELLER" });
      }),
    },
  };
});

const authCookie = "userToken=mock-token";

// ─── DATOS DE PRUEBA ─────────────────────────────────────────────────────────

const mockStore = {
  id_store: 1,
  fk_user: 1,
  status: true,
  user: { id_user: 1, status: true },
};

const mockStoreOtherOwner = {
  id_store: 1,
  fk_user: 99,
  status: true,
  user: { id_user: 99, status: true },
};

// Disponible: ACTIVE + sin asignaciones activas, 2 reseñas (5 y 4)
const mockDeliveryAvailable = {
  id_delivery: 10,
  delivery_status: "ACTIVE",
  vehicle_type: "MOTORCYCLE",
  user: { id_user: 2, name: "Juan Pérez", email: "juan@delivery.com", phone: "+56912345678" },
  delivery_assignments: [],
  delivery_reviews: [{ rating: 5 }, { rating: 4 }],
};

// En entrega: tiene asignación ACCEPTED + 3 reseñas (5, 5, 4) + 2 DELIVERED, 0 REJECTED
const mockDeliveryInDelivery = {
  id_delivery: 11,
  delivery_status: "ACTIVE",
  vehicle_type: "CAR",
  user: { id_user: 3, name: "María González", email: "maria@delivery.com", phone: "+56923456789" },
  delivery_assignments: [
    { assignment_status: "ACCEPTED" },
    { assignment_status: "DELIVERED" },
    { assignment_status: "DELIVERED" },
  ],
  delivery_reviews: [{ rating: 5 }, { rating: 5 }, { rating: 4 }],
};

// No disponible: INACTIVE + sin asignaciones activas, 1 DELIVERED 1 REJECTED, sin reseñas
const mockDeliveryUnavailable = {
  id_delivery: 12,
  delivery_status: "INACTIVE",
  vehicle_type: "BICYCLE",
  user: { id_user: 4, name: "Carlos Ramírez", email: "carlos@delivery.com", phone: "+56934567890" },
  delivery_assignments: [
    { assignment_status: "DELIVERED" },
    { assignment_status: "REJECTED" },
  ],
  delivery_reviews: [],
};

// ─── GET /api/deliveries/search ───────────────────────────────────────────────

describe("GET /api/deliveries/search", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna array vacío si no se provee query", async () => {
    const res = await request(app)
      .get("/api/deliveries/search")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna candidatos correctamente", async () => {
    const mockCandidates = [
      { id_user: 2, name: "Delivery 1", email: "del@test.com", phone: "123" },
    ];
    prisma.users.findMany.mockResolvedValue(mockCandidates);

    const res = await request(app)
      .get("/api/deliveries/search?q=del")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockCandidates);
    expect(prisma.users.findMany).toHaveBeenCalledTimes(1);
  });
});

// ─── POST /api/stores/:id/deliveries ─────────────────────────────────────────

describe("POST /api/stores/:id/deliveries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 si fk_user no se envía", async () => {
    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", authCookie)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fk_user es requerido/);
  });

  it("retorna 403 si la tienda no pertenece al usuario", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStoreOtherOwner);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", authCookie)
      .send({ fk_user: 2 });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permisos/i);
  });

  it("retorna 404 si el candidato a delivery no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", authCookie)
      .send({ fk_user: 2 });
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Candidato a delivery no encontrado/i);
  });

  it("retorna 409 si el delivery ya está vinculado", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue({ id_user: 2, role: "DELIVERY", status: true });
    const prismaError = new Error("Unique constraint failed");
    prismaError.code = "P2002";
    prisma.deliveries.create.mockRejectedValue(prismaError);
    prisma.deliveries.findUnique.mockResolvedValue({ fk_store: 1, fk_user: 2 });

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", authCookie)
      .send({ fk_user: 2 });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/ya está vinculado/i);
  });

  it("retorna 201 y el delivery creado al vincular correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.users.findFirst.mockResolvedValue({ id_user: 2, role: "DELIVERY", status: true });
    prisma.deliveries.findUnique.mockResolvedValue(null);
    const mockDelivery = { id_delivery: 10, fk_store: 1, fk_user: 2, delivery_status: "INACTIVE" };
    prisma.deliveries.create.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .post("/api/stores/1/deliveries")
      .set("Cookie", authCookie)
      .send({ fk_user: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(mockDelivery);
  });
});

// ─── GET /api/stores/:id/deliveries ──────────────────────────────────────────

describe("GET /api/stores/:id/deliveries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 403 si la tienda no pertenece al usuario", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStoreOtherOwner);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("retorna 404 si la tienda no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);
    expect(res.status).toBe(404);
  });

  it("retorna lista vacía y stats en cero cuando no hay repartidores", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.deliveries).toEqual([]);
    expect(res.body.stats).toMatchObject({
      total: 0,
      available: 0,
      inDelivery: 0,
      avgRating: null,
    });
  });

  it("calcula stats correctamente con múltiples repartidores", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([
      mockDeliveryAvailable,
      mockDeliveryInDelivery,
      mockDeliveryUnavailable,
    ]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({
      total: 3,
      available: 1,
      inDelivery: 1,
    });
    // ratings: [5,4] + [5,5,4] + [] = [5,4,5,5,4] = 23/5 = 4.6
    expect(res.body.stats.avgRating).toBe(4.6);
  });

  it("deriva status AVAILABLE para repartidor activo sin asignaciones activas", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryAvailable]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    const d = res.body.deliveries[0];
    expect(d.status).toBe("AVAILABLE");
    expect(d.completedDeliveries).toBe(0);
    expect(d.successRate).toBeNull();
    expect(d.avgRating).toBe(4.5);
    expect(d.reviewCount).toBe(2);
  });

  it("deriva status IN_DELIVERY para repartidor con asignación activa", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryInDelivery]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    const d = res.body.deliveries[0];
    expect(d.status).toBe("IN_DELIVERY");
    expect(d.completedDeliveries).toBe(2);
    expect(d.successRate).toBe(100); // 2 DELIVERED, 0 REJECTED
    // avgRating: (5+5+4)/3 = 4.7
    expect(d.avgRating).toBe(4.7);
  });

  it("deriva status UNAVAILABLE para repartidor INACTIVE", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryUnavailable]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    const d = res.body.deliveries[0];
    expect(d.status).toBe("UNAVAILABLE");
    expect(d.completedDeliveries).toBe(1);
    expect(d.successRate).toBe(50); // 1 DELIVERED, 1 REJECTED
    expect(d.avgRating).toBeNull();
    expect(d.reviewCount).toBe(0);
  });

  it("retorna los datos del usuario correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryAvailable]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    expect(res.body.deliveries[0].user).toMatchObject({
      id: 2,
      name: "Juan Pérez",
      email: "juan@delivery.com",
      phone: "+56912345678",
    });
  });

  it("retorna vehicleType en el objeto de delivery", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryAvailable]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    expect(res.body.deliveries[0].vehicleType).toBe("MOTORCYCLE");
  });

  it("status IN_DELIVERY también aplica cuando la asignación es PENDING", async () => {
    const deliveryWithPending = {
      ...mockDeliveryAvailable,
      delivery_assignments: [{ assignment_status: "PENDING" }],
    };
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([deliveryWithPending]);

    const res = await request(app)
      .get("/api/stores/1/deliveries")
      .set("Cookie", authCookie);

    expect(res.body.deliveries[0].status).toBe("IN_DELIVERY");
  });
});

// ─── DELETE /api/stores/:id/deliveries/:deliveryId ────────────────────────────

describe("DELETE /api/stores/:id/deliveries/:deliveryId", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 403 si la tienda no pertenece al usuario", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStoreOtherOwner);

    const res = await request(app)
      .delete("/api/stores/1/deliveries/10")
      .set("Cookie", authCookie);
    expect(res.status).toBe(403);
  });

  it("retorna 404 si el delivery no pertenece a la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/stores/1/deliveries/10")
      .set("Cookie", authCookie);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/Delivery no encontrado/i);
  });

  it("retorna 400 si el delivery tiene entregas activas (PENDING)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findFirst.mockResolvedValue({
      id_delivery: 10,
      delivery_assignments: [{ id_delivery_assignment: 99 }],
    });

    const res = await request(app)
      .delete("/api/stores/1/deliveries/10")
      .set("Cookie", authCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/entregas activas/i);
  });

  it("retorna 204 y desvincula el delivery correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findFirst.mockResolvedValue({
      id_delivery: 10,
      delivery_assignments: [], // sin activas
    });
    prisma.deliveries.update.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/stores/1/deliveries/10")
      .set("Cookie", authCookie);

    expect(res.status).toBe(204);
    expect(prisma.deliveries.update).toHaveBeenCalledWith({
      where: { id_delivery: 10 },
      data: { fk_store: null },
    });
  });

  it("no elimina al usuario, solo desvincula (fk_store = null)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findFirst.mockResolvedValue({
      id_delivery: 10,
      delivery_assignments: [],
    });
    prisma.deliveries.update.mockResolvedValue({});

    await request(app)
      .delete("/api/stores/1/deliveries/10")
      .set("Cookie", authCookie);

    // update solo cambia fk_store, no toca status ni el usuario
    expect(prisma.deliveries.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { fk_store: null },
      })
    );
    expect(prisma.users).not.toHaveProperty("delete");
  });
});

// ─── GET /api/stores/:storeId/deliveries/:deliveryId/reviews ──────────────────

describe("GET /api/stores/:storeId/deliveries/:deliveryId/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando search no es numérico", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?search=abc")
      .set("Cookie", authCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ID de pedido/i);
  });

  it("retorna 400 cuando minRating está fuera de rango", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?minRating=6")
      .set("Cookie", authCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minRating/i);
  });

  it("retorna 404 cuando el delivery no pertenece a la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews")
      .set("Cookie", authCookie);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/delivery no encontrado/i);
  });

  it("retorna 200 con reseñas mapeadas correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue({ id_delivery: 2, fk_store: 1 });
    prisma.deliveryReviews.findMany.mockResolvedValue([
      {
        id_delivery_review: 5,
        fk_order: 120,
        rating: 5,
        comment: "Entrega rápida",
        created_at: new Date("2026-04-28T00:00:00.000Z"),
        user: { name: "Juan" },
      },
    ]);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?minRating=4&maxRating=5")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.reviews[0]).toMatchObject({
      orderId: 120,
      customerName: "Juan",
      rating: 5,
    });
  });
});