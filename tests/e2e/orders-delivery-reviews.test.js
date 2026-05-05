import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

// Mock Prisma
vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findFirst: vi.fn(),
    },
    deliveryReviews: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    orders: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
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

    if (cookie === "seller-token") {
      req.user = { id_user: 2, email: "seller@test.com", role: "SELLER" };
    } else if (cookie === "delivery-token") {
      req.user = { id_user: 3, email: "delivery@test.com", role: "DELIVERY" };
    } else {
      req.user = { id_user: 1, email: "customer@test.com", role: "CUSTOMER" };
    }

    next();
  }),
}));

const customerCookie = "userToken=customer-token";
const sellerCookie = "userToken=seller-token";
const deliveryCookie = "userToken=delivery-token";

const mockCustomerUser = {
  id_user: 1,
  role: "CUSTOMER",
  status: true,
};

const mockSellerUser = {
  id_user: 2,
  role: "SELLER",
  status: true,
};

const mockPendingReviews = [
  {
    id_order: 100,
    updated_at: new Date("2026-04-01"),
    store: {
      name: "Store A",
    },
    delivery_assignments: [
      {
        fk_delivery: 10,
        delivery: {
          user: {
            name: "Juan Pérez",
          },
        },
      },
    ],
  },
  {
    id_order: 101,
    updated_at: new Date("2026-04-02"),
    store: {
      name: "Store B",
    },
    delivery_assignments: [
      {
        fk_delivery: 11,
        delivery: {
          user: {
            name: "María López",
          },
        },
      },
    ],
  },
];

describe("GET /api/orders/pending-delivery-reviews & POST /api/orders/:orderId/delivery-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.users.findFirst.mockReset();
    prisma.deliveryReviews.findMany.mockReset();
    prisma.orders.findMany.mockReset();
    prisma.orders.findFirst.mockReset();
    prisma.deliveryAssignments.findFirst.mockReset();
    prisma.deliveryReviews.create.mockReset();
  });

  // GET /api/orders/pending-delivery-reviews tests

  it("retorna 401 cuando se hace un GET pending reviews sin autenticación", async () => {
    const res = await request(app)
      .get("/api/orders/pending-delivery-reviews")
      .expect(401);

    expect(res.body.error.code).toBe(401);
    expect(res.body.error.message).toMatch(/no autenticado/i);
  });

  it("retorna 403 cuando el usuario es SELLER (no CUSTOMER) y hace un GET pending reviews", async () => {
    prisma.users.findFirst.mockResolvedValue(mockSellerUser);

    const res = await request(app)
      .get("/api/orders/pending-delivery-reviews")
      .set("Cookie", sellerCookie)
      .expect(403);

    expect(res.body.error.code).toBe(403);
    expect(res.body.error.message).toMatch(/solo clientes pueden calificar/i);
  });

  it("retorna 200 con lista de pedidos pendientes de calificar cuando el usuario es cliente y tiene pedidos", async () => {
    prisma.users.findFirst.mockResolvedValue(mockCustomerUser);
    prisma.deliveryReviews.findMany.mockResolvedValue([]);
    prisma.orders.findMany.mockResolvedValue(mockPendingReviews);

    const res = await request(app)
      .get("/api/orders/pending-delivery-reviews")
      .set("Cookie", customerCookie)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      orderId: 100,
      deliveryId: 10,
      deliveryName: "Juan Pérez",
      storeName: "Store A",
    });
    expect(res.body[1]).toMatchObject({
      orderId: 101,
      deliveryId: 11,
      deliveryName: "María López",
      storeName: "Store B",
    });
  });

  // POST /api/orders/:orderId/delivery-review tests

  it("retorna 400 cuando rating es menor a uno", async () => {
    const res = await request(app)
      .post("/api/orders/100/delivery-review")
      .set("Cookie", customerCookie)
      .send({ rating: 0, comment: "Buen servicio" })
      .expect(400);

    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/entre 1 y 5/i);
  });

  it("retorna 400 cuando rating es mayor a cinco", async () => {
    const res = await request(app)
      .post("/api/orders/100/delivery-review")
      .set("Cookie", customerCookie)
      .send({ rating: 6, comment: "Buen servicio" })
      .expect(400);

    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/entre 1 y 5/i);
  });

  it("retorna 400 cuando comentario excede 1000 caracteres", async () => {
    const longComment = "a".repeat(1001);

    const res = await request(app)
      .post("/api/orders/100/delivery-review")
      .set("Cookie", customerCookie)
      .send({ rating: 5, comment: longComment })
      .expect(400);

    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/no puede superar los 1000/i);
  });

  it("retorna 409 cuando el pedido ya tiene una calificación", async () => {
    prisma.users.findFirst.mockResolvedValue(mockCustomerUser);
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "DELIVERED",
      fk_user: 1,
      status: true,
    });
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
      fk_delivery: 10,
    });
    prisma.deliveryReviews.create.mockRejectedValue({
      code: "P2002",
      meta: { target: ["fk_order"] },
    });

    const res = await request(app)
      .post("/api/orders/100/delivery-review")
      .set("Cookie", customerCookie)
      .send({ rating: 5, comment: "Excelente" })
      .expect(409);

    expect(res.body.error.code).toBe(409);
    expect(res.body.error.message).toMatch(/ya tiene una calificación/i);
  });

  it("retorna 201 cuando se crea calificación válida con los respectivos datos de la calificación", async () => {
    prisma.users.findFirst.mockResolvedValue(mockCustomerUser);
    prisma.orders.findFirst.mockResolvedValue({
      id_order: 100,
      order_status: "DELIVERED",
      fk_user: 1,
      status: true,
    });
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
      fk_delivery: 10,
    });
    prisma.deliveryReviews.create.mockResolvedValue({
      id_delivery_review: 1,
      fk_order: 100,
      fk_user: 1,
      fk_delivery: 10,
      rating: 5,
      comment: "Excelente servicio",
      created_at: new Date("2026-05-05"),
    });

    const res = await request(app)
      .post("/api/orders/100/delivery-review")
      .set("Cookie", customerCookie)
      .send({ rating: 5, comment: "Excelente servicio" })
      .expect(201);

    expect(res.body).toMatchObject({
      id: 1,
      orderId: 100,
      deliveryId: 10,
      rating: 5,
      comment: "Excelente servicio",
    });
    expect(res.body.createdAt).toBeDefined();
  });
});
