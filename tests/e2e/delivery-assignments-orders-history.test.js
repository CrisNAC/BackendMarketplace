import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

// Mock Prisma
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    deliveries: {
      findUnique: vi.fn(),
    },
    deliveryAssignments: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callbackOrArray) => {
      if (typeof callbackOrArray === "function") {
        return callbackOrArray({});
      }
      return Promise.all(callbackOrArray.map((op) => Promise.resolve(op)));
    }),
  },
}));

// Mock JWT Config
vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    const cookie = req.cookies?.userToken;

    if (!cookie) {
      return res.status(401).json({
        error: { code: 401, message: "No autenticado" },
      });
    }

    req.user = cookie === "other-delivery"
      ? { id_user: 99, email: "other@test.com", role: "DELIVERY" }
      : { id_user: 5, email: "delivery@test.com", role: "DELIVERY" };

    next();
  }),
}));

const authCookie = "userToken=mock-token";
const otherDeliveryCookie = "userToken=other-delivery";

const mockDelivery = {
  id_delivery: 1,
  fk_user: 5,
  status: true,
};

const mockDeliveryOther = {
  id_delivery: 2,
  fk_user: 99,
  status: true,
};

const mockAssignments = [
  {
    id_delivery_assignment: 1,
    assignment_status: "DELIVERED",
    assignment_sequence: 1,
    created_at: new Date("2026-04-01"),
    order: {
      id_order: 100,
      order_status: "DELIVERED",
      total: "150.00",
      shipping_cost: "10.00",
      created_at: new Date("2026-04-01"),
      user: { id_user: 1, name: "Juan Pérez" },
      store: { id_store: 1, name: "Store 1" },
    },
  },
  {
    id_delivery_assignment: 2,
    assignment_status: "DELIVERED",
    assignment_sequence: 1,
    created_at: new Date("2026-04-02"),
    order: {
      id_order: 101,
      order_status: "DELIVERED",
      total: "200.00",
      shipping_cost: "15.00",
      created_at: new Date("2026-04-02"),
      user: { id_user: 2, name: "María López" },
      store: { id_store: 2, name: "Store 2" },
    },
  },
];

describe("GET /api/assignments/:id/orders - Delivery Order History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.deliveries.findUnique.mockReset();
    prisma.deliveryAssignments.findMany.mockReset();
    prisma.deliveryAssignments.count.mockReset();
  });

  it("retorna 403 cuando el usuario autenticado no es el delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/assignments/1/orders")
      .set("Cookie", otherDeliveryCookie)
      .expect(403);

    expect(res.body.error.code).toBe(403);
    expect(res.body.error.message).toMatch(/no tienes permiso/i);
  });

  it("retorna 400 cuando el ID de delivery es inválido", async () => {
    const res = await request(app)
      .get("/api/assignments/abc/orders")
      .set("Cookie", authCookie)
      .expect(400);

    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/inválido/i);
  });

  it("retorna 200 con lista completa de pedidos, total y ganancias", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryAssignments.findMany.mockResolvedValue(mockAssignments);
    prisma.deliveryAssignments.count.mockResolvedValue(2);

    const res = await request(app)
      .get("/api/assignments/1/orders")
      .set("Cookie", authCookie)
      .expect(200);

    expect(res.body).toHaveProperty("content");
    expect(res.body).toHaveProperty("total_elements");
    expect(res.body).toHaveProperty("total_pages");
    expect(res.body).toHaveProperty("page");
    expect(res.body.content).toHaveLength(2);
    expect(res.body.content[0]).toMatchObject({
      id_delivery_assignment: 1,
      assignment_status: "DELIVERED",
      order: {
        id_order: 100,
        order_status: "DELIVERED",
      },
    });
  });

  it("retorna 200 con pedidos filtrados por estado DELIVERED", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    const filteredAssignments = mockAssignments.filter(
      (a) => a.assignment_status === "DELIVERED"
    );
    prisma.deliveryAssignments.findMany.mockResolvedValue(filteredAssignments);
    prisma.deliveryAssignments.count.mockResolvedValue(filteredAssignments.length);

    const res = await request(app)
      .get("/api/assignments/1/orders?assignment_status=DELIVERED")
      .set("Cookie", authCookie)
      .expect(200);

    expect(res.body.content).toHaveLength(2);
    expect(res.body.content.every((a) => a.assignment_status === "DELIVERED")).toBe(
      true
    );
  });

  it("retorna 200 con pedidos paginados e incluye metadata de paginación", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    const pagedAssignments = [mockAssignments[0]];
    prisma.deliveryAssignments.findMany.mockResolvedValue(pagedAssignments);
    prisma.deliveryAssignments.count.mockResolvedValue(2);

    const res = await request(app)
      .get("/api/assignments/1/orders?page=1&limit=1")
      .set("Cookie", authCookie)
      .expect(200);

    expect(res.body).toHaveProperty("content");
    expect(res.body).toHaveProperty("total_elements", 2);
    expect(res.body).toHaveProperty("total_pages");
    expect(res.body).toHaveProperty("page");
    expect(res.body.content).toHaveLength(1);
  });

  it("retorna 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/assignments/999/orders")
      .set("Cookie", authCookie)
      .expect(404);

    expect(res.body.error.code).toBe(404);
    expect(res.body.error.message).toMatch(/no encontrado/i);
  });
});
