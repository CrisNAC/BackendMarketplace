import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";


let deliveriesTxMock = { findFirst: vi.fn(), update: vi.fn() };

// Mock Prisma
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    stores: { findUnique: vi.fn() },
    deliveries: { findMany: vi.fn() },
    deliveryReviews: { findMany: vi.fn() },
    $transaction: vi.fn(async (fn) => fn({ deliveries: deliveriesTxMock })),
  },
}));

// Mock JWT middleware 
vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) return res.status(401).json({ error: { code: 401, message: "No autenticado" } });

    if (cookie === "seller-token") req.user = { id_user: 2, email: "seller@test.com", role: "SELLER" };
    else if (cookie === "delivery-token") req.user = { id_user: 3, email: "delivery@test.com", role: "DELIVERY" };
    else req.user = { id_user: 1, email: "customer@test.com", role: "CUSTOMER" };

    next();
  }),
}));

const sellerCookie = "userToken=seller-token";

const mockStore = { id_store: 1, fk_user: 2, status: true, user: { id_user: 2, status: true } };
const mockStoreOtherOwner = { id_store: 1, fk_user: 99, status: true, user: { id_user: 99, status: true } };

// Mocks de deliveries 
const mockDeliveryAvailable = {
  id_delivery: 10,
  delivery_status: "ACTIVE",
  vehicle_type: "MOTORCYCLE",
  user: { id_user: 2, name: "Juan Pérez", email: "juan@delivery.com", phone: "+56912345678" },
  delivery_assignments: [],
  delivery_reviews: [{ rating: 5 }, { rating: 4 }],
};

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

const mockDeliveryUnavailable = {
  id_delivery: 12,
  delivery_status: "INACTIVE",
  vehicle_type: "BICYCLE",
  user: { id_user: 4, name: "Carlos Ramírez", email: "carlos@delivery.com", phone: "+56934567890" },
  delivery_assignments: [{ assignment_status: "DELIVERED" }, { assignment_status: "REJECTED" }],
  delivery_reviews: [],
};

describe("OM-322: GET /stores/:id/deliveries & DELETE /stores/:id/deliveries/:deliveryId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset tx mocks
    deliveriesTxMock.findFirst = vi.fn();
    deliveriesTxMock.update = vi.fn();
  });

  it("GET - retorna lista y estadísticas exitosamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findMany.mockResolvedValue([mockDeliveryAvailable, mockDeliveryInDelivery, mockDeliveryUnavailable]);

    const res = await request(app).get("/api/stores/1/deliveries").set("Cookie", sellerCookie);

    expect(res.status).toBe(200);
    expect(res.body.stats).toMatchObject({ total: 3, available: 1, inDelivery: 1 });
    // ratings: [5,4] + [5,5,4] = [5,4,5,5,4] => 23/5 = 4.6
    expect(res.body.stats.avgRating).toBe(4.6);
    expect(Array.isArray(res.body.deliveries)).toBe(true);
    expect(res.body.deliveries[0]).toMatchObject({ user: { id: 2, name: "Juan Pérez" }, vehicleType: "MOTORCYCLE" });
  });

  it("GET - 403 si el requester no es dueño del comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStoreOtherOwner);

    const res = await request(app).get("/api/stores/1/deliveries").set("Cookie", sellerCookie);
    expect(res.status).toBe(403);
  });

  it("GET - 404 si la tienda no existe", async () => {
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/stores/1/deliveries").set("Cookie", sellerCookie);
    expect(res.status).toBe(404);
  });

  it("DELETE - desvincula delivery correctamente", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    // en la transacción, findFirst devuelve sin assignments activos
    deliveriesTxMock.findFirst.mockResolvedValue({ id_delivery: 10, delivery_assignments: [] });
    deliveriesTxMock.update.mockResolvedValue({});

    const res = await request(app).delete("/api/stores/1/deliveries/10").set("Cookie", sellerCookie);
    expect(res.status).toBe(204);
    expect(deliveriesTxMock.update).toHaveBeenCalledWith({ where: { id_delivery: 10 }, data: { fk_store: null, delivery_status: "INACTIVE" } });
  });

  it("DELETE - retorna 400 si tiene assignments activos (PENDING/ACCEPTED)", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    deliveriesTxMock.findFirst.mockResolvedValue({ id_delivery: 10, delivery_assignments: [{ id_delivery_assignment: 1 }] });

    const res = await request(app).delete("/api/stores/1/deliveries/10").set("Cookie", sellerCookie);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/entregas activas/i);
  });

  it("DELETE - 403 si el requester no es dueño del comercio", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStoreOtherOwner);

    const res = await request(app).delete("/api/stores/1/deliveries/10").set("Cookie", sellerCookie);
    expect(res.status).toBe(403);
  });

  it("DELETE - 404 si el delivery no pertenece a la tienda", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    deliveriesTxMock.findFirst.mockResolvedValue(null);

    const res = await request(app).delete("/api/stores/1/deliveries/999").set("Cookie", sellerCookie);
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/delivery no encontrado/i);
  });
});
