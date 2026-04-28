import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    deliveries: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("jsonwebtoken", async () => {
  const actual = await vi.importActual("jsonwebtoken");
  return {
    default: {
      ...actual.default,
      verify: vi.fn((token, secret, callback) => {
        callback(null, { id_user: 10, email: "delivery@test.com", role: "DELIVERY" });
      }),
    },
  };
});

const authCookie = "userToken=mock-token";

const mockDelivery = {
  id_delivery: 1,
  fk_user: 10,
  delivery_status: "ACTIVE",
  status: true,
};

describe("PATCH /api/deliveries/:id/status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando delivery_status no se envía", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/delivery_status es requerido/i);
  });

  it("devuelve 400 cuando delivery_status es inválido", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({ delivery_status: "SUSPENDED" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ACTIVE o INACTIVE/i);
  });

  it("devuelve 401 cuando no hay autenticación", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es DELIVERY", async () => {
    const jwt = await import("jsonwebtoken");
    jwt.default.verify.mockImplementationOnce((token, secret, callback) => {
      callback(null, { id_user: 10, email: "admin@test.com", role: "ADMIN" });
    });

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permisos/i);
  });

  it("devuelve 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 403 cuando intenta actualizar otro delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValue({
      ...mockDelivery,
      fk_user: 99,
    });

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({ delivery_status: "INACTIVE" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/actualizar este delivery/i);
  });

  it("devuelve 200 y actualiza el estado correctamente", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);
    prisma.deliveries.update.mockResolvedValue({
      id_delivery: 1,
      delivery_status: "INACTIVE",
      status: true,
      updated_at: new Date("2026-04-28T00:00:00.000Z"),
    });

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie)
      .send({ delivery_status: "INACTIVE" });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/actualizado exitosamente/i);
    expect(res.body.data).toMatchObject({
      id_delivery: 1,
      delivery_status: "INACTIVE",
      status: true,
    });
  });
});