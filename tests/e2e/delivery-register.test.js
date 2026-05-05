import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deliveries: {
      create: vi.fn(),
    },
    $transaction: vi.fn((operations) => Promise.all(operations)),
  },
}));

vi.mock("../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    if (!req.cookies?.userToken) {
      return res.status(401).json({
        errors: { auth: { message: "No autenticado" } },
      });
    }

    req.user = { id_user: 10, email: "customer@test.com", role: "CUSTOMER" };
    next();
  }),
}));

const authCookie = "userToken=mock-token";

describe("POST /api/deliveries/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retorna 400 cuando vehicleType no se envía", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/datos inválidos/i);
  });

  it("retorna 400 cuando vehicleType es inválido", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({ vehicleType: "PLANE" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
    expect(res.body.error.message).toMatch(/datos inválidos/i);
  });

  it("retorna 404 cuando el usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({ vehicleType: "CAR" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/usuario no encontrado/i);
  });

  it("retorna 403 cuando el usuario no es CUSTOMER", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 10,
      role: "SELLER",
      delivery: null,
    });

    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({ vehicleType: "CAR" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/solo un usuario customer/i);
  });

  it("retorna 409 cuando el usuario ya es delivery", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 10,
      role: "DELIVERY",
      delivery: { id_delivery: 5 },
    });

    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({ vehicleType: "BICYCLE" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/ya está registrado como delivery/i);
  });

  it("retorna 200 y crea el delivery con estado INACTIVE", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 10,
      role: "CUSTOMER",
      delivery: null,
    });

    prisma.users.update.mockResolvedValue({
      id_user: 10,
      name: "Juan",
      email: "customer@test.com",
      phone: "1234567890",
      role: "DELIVERY",
    });

    prisma.deliveries.create.mockResolvedValue({
      id_delivery: 1,
      fk_user: 10,
      fk_store: null,
      delivery_status: "INACTIVE",
      vehicle_type: "MOTORCYCLE",
      status: true,
    });

    const res = await request(app)
      .post("/api/deliveries/register")
      .set("Cookie", authCookie)
      .send({ vehicleType: "MOTORCYCLE" });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("DELIVERY");
    expect(res.body.delivery.delivery_status).toBe("INACTIVE");
    expect(res.body.delivery.fk_store).toBe(null);
    expect(res.body.delivery.vehicle_type).toBe("MOTORCYCLE");
    expect(prisma.users.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_user: 10 },
        data: { role: "DELIVERY" },
      })
    );
    expect(prisma.deliveries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fk_user: 10,
          fk_store: null,
          delivery_status: "INACTIVE",
          vehicle_type: "MOTORCYCLE",
        }),
      })
    );
  });
});