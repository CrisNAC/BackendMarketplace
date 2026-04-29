//delivery-review.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    orders: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
    },
    deliveryReviews: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    deliveryAssignments: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    req.user = { id_user: 5, email: "customer@test.com", role: "CUSTOMER" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";

const mockOrder = {
  id_order: 1,
  fk_user: 5,
  total: 100.0,
  order_status: "DELIVERED",
};

const mockDelivery = {
  id_delivery: 1,
  fk_user: 10,
  delivery_status: "ACTIVE",
};

const mockReview = {
  id_delivery_review: 1,
  fk_order: 1,
  fk_user: 5,
  fk_delivery: 1,
  rating: 5,
  comment: "Excelente servicio",
  status: true,
  created_at: new Date(),
};

describe("POST /api/reviews/delivery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({ fk_order: 1 }); // Falta fk_delivery y rating

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando rating está fuera de rango (1-5)", async () => {
    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
        rating: 10, // Rating inválido
        comment: "Test",
      });

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando comentario excede 500 caracteres", async () => {
    const longComment = "a".repeat(501);
    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
        rating: 5,
        comment: longComment,
      });

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 999,
        fk_delivery: 1,
        rating: 5,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/pedido no encontrado/i);
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 999,
        rating: 5,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 409 cuando ya existe reseña para este pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findUnique.mockResolvedValue(mockReview);

    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
        rating: 5,
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/ya existe una reseña/i);
  });

  it("devuelve 403 cuando delivery no aceptó el pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);
    prisma.deliveryAssignments.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
        rating: 5,
      });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/no aceptó este pedido/i);
  });

  it("devuelve 201 y crea reseña exitosamente", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);
    prisma.deliveryAssignments.findFirst.mockResolvedValue({
      id_delivery_assignment: 1,
      assignment_status: "ACCEPTED",
    });
    prisma.deliveryReviews.create.mockResolvedValue(mockReview);

    const res = await request(app)
      .post("/api/reviews/delivery")
      .set("Cookie", authCookie)
      .send({
        fk_order: 1,
        fk_delivery: 1,
        rating: 5,
        comment: "Excelente servicio",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      fk_order: 1,
      rating: 5,
      comment: "Excelente servicio",
    });
  });
});

describe("GET /api/reviews/delivery/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando reseña no existe", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/reviews/delivery/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/reseña no encontrada/i);
  });

  it("devuelve 200 y la reseña con detalles", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue({
      ...mockReview,
      user: { id_user: 5, name: "Juan", avatar_url: null },
      delivery: { id_delivery: 1 },
      order: { id_order: 1 },
    });

    const res = await request(app)
      .get("/api/reviews/delivery/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id_delivery_review: 1,
      rating: 5,
    });
  });
});

describe("GET /api/reviews/delivery/deliveries/:deliveryId/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/999/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 200 y lista de reseñas con estadísticas", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue([
      mockReview,
      { ...mockReview, id_delivery_review: 2, rating: 4 },
    ]);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/1/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      delivery_id: 1,
      total_reviews: 2,
      average_rating: 4.5,
    });
  });

  it("devuelve promedio 0 cuando no hay reseñas", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/1/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.average_rating).toBe(0);
  });
});

describe("GET /api/reviews/delivery/orders/:orderId/review", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando pedido no existe", async () => {
    prisma.orders.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/reviews/delivery/orders/999/review")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/pedido no encontrado/i);
  });

  it("devuelve 404 cuando no hay reseña para el pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/reviews/delivery/orders/1/review")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/no hay reseña/i);
  });

  it("devuelve 200 y la reseña del pedido", async () => {
    prisma.orders.findUnique.mockResolvedValue(mockOrder);
    prisma.deliveryReviews.findUnique.mockResolvedValue({
      ...mockReview,
      user: { id_user: 5, name: "Juan" },
      delivery: { id_delivery: 1 },
    });

    const res = await request(app)
      .get("/api/reviews/delivery/orders/1/review")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.fk_order).toBe(1);
  });
});

describe("PUT /api/reviews/delivery/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando no hay campos para actualizar", async () => {
    const res = await request(app)
      .put("/api/reviews/delivery/1")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando rating está fuera de rango", async () => {
    const res = await request(app)
      .put("/api/reviews/delivery/1")
      .set("Cookie", authCookie)
      .send({ rating: 10 });

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando reseña no existe", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/reviews/delivery/999")
      .set("Cookie", authCookie)
      .send({ rating: 4 });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/reseña no encontrada/i);
  });

  it("devuelve 200 y actualiza reseña", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue(mockReview);
    prisma.deliveryReviews.update.mockResolvedValue({
      ...mockReview,
      rating: 4,
      comment: "Muy bueno",
    });

    const res = await request(app)
      .put("/api/reviews/delivery/1")
      .set("Cookie", authCookie)
      .send({
        rating: 4,
        comment: "Muy bueno",
      });

    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4);
  });
});

describe("DELETE /api/reviews/delivery/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando reseña no existe", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/reviews/delivery/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/reseña no encontrada/i);
  });

  it("devuelve 200 y elimina reseña", async () => {
    prisma.deliveryReviews.findUnique.mockResolvedValue(mockReview);
    prisma.deliveryReviews.update.mockResolvedValue({
      ...mockReview,
      status: false,
    });

    const res = await request(app)
      .delete("/api/reviews/delivery/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminada/i);
  });
});

describe("GET /api/reviews/delivery/deliveries/:deliveryId/stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/999/stats")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve estadísticas cuando hay reseñas", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue([
      { ...mockReview, rating: 5 },
      { ...mockReview, rating: 5 },
      { ...mockReview, rating: 4 },
    ]);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/1/stats")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      delivery_id: 1,
      total_reviews: 3,
      average_rating: expect.any(Number),
      rating_distribution: {
        five_stars: 2,
        four_stars: 1,
      },
    });
  });

  it("devuelve estadísticas cuando no hay reseñas", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/reviews/delivery/deliveries/1/stats")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      delivery_id: 1,
      total_reviews: 0,
      average_rating: 0,
    });
  });
});