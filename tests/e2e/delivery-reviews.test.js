import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    stores: {
      findUnique: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
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
        callback(null, { id_user: 1, email: "seller@test.com", role: "SELLER" });
      }),
    },
  };
});

const authCookie = "userToken=mock-token";

const mockStore = {
  id_store: 1,
  fk_user: 1,
  status: true,
  user: { id_user: 1, status: true },
};

const mockDelivery = {
  id_delivery: 2,
  fk_store: 1,
};

const mockReviews = [
  {
    id_delivery_review: 5,
    fk_order: 120,
    rating: 5,
    comment: "Entrega rápida",
    created_at: new Date("2026-04-28T00:00:00.000Z"),
    user: { name: "Juan" },
  },
];

describe("GET /api/stores/:storeId/deliveries/:deliveryId/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 200 con todas las reseñas del delivery", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue(mockReviews);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.reviews).toHaveLength(1);
    expect(res.body.reviews[0]).toMatchObject({
      id: 5,
      orderId: 120,
      customerName: "Juan",
      rating: 5,
      comment: "Entrega rápida",
    });
    expect(prisma.deliveryReviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fk_delivery: 2,
          status: true,
        },
        orderBy: { created_at: "desc" },
      })
    );
  });

  it("filtra reseñas por search con ID de pedido", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue(mockReviews);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?search=120")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(prisma.deliveryReviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fk_delivery: 2,
          fk_order: 120,
        }),
      })
    );
    expect(res.body.total).toBe(1);
  });

  it("filtra reseñas por rango de estrellas", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue(mockReviews);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?minRating=4&maxRating=5")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(prisma.deliveryReviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fk_delivery: 2,
          rating: {
            gte: 4,
            lte: 5,
          },
        }),
      })
    );
  });

  it("filtra reseñas por id de pedido y rango de estrellas", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveryReviews.findMany.mockResolvedValue(mockReviews);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?search=120&minRating=4&maxRating=5")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(prisma.deliveryReviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          fk_delivery: 2,
          fk_order: 120,
          rating: { gte: 4, lte: 5 },
        }),
      })
    );
    expect(res.body.total).toBe(1);
  });

  it("retorna 400 cuando maxRating es inválido", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?maxRating=6")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maxRating debe estar entre 1 y 5/i);
  });

  it("retorna 400 cuando minRating es mayor a maxRating", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?minRating=5&maxRating=3")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minRating no puede ser mayor que maxRating/i);
  });

  it("retorna 400 cuando search no es numérico", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?search=abc")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/ID de pedido debe ser un entero mayor a 0/i);
  });

  it("retorna 400 cuando minRating es inválido", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews?minRating=6")
      .set("Cookie", authCookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/minRating debe estar entre 1 y 5/i);
  });

  it("retorna 403 cuando el store no pertenece al usuario autenticado", async () => {
    prisma.stores.findUnique.mockResolvedValue({
      ...mockStore,
      fk_user: 99,
      user: { id_user: 99, status: true },
    });

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/no tiene permisos para editar este comercio/i);
  });

  it("retorna 404 cuando el delivery no está vinculado al store", async () => {
    prisma.stores.findUnique.mockResolvedValue(mockStore);
    prisma.deliveries.findUnique.mockResolvedValue({
      id_delivery: 2,
      fk_store: 99,
    });

    const res = await request(app)
      .get("/api/stores/1/deliveries/2/reviews")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/delivery no encontrado para este comercio/i);
  });
});