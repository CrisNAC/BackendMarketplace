import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

const deliveriesMock = {
  findUnique: vi.fn(),
  update: vi.fn(),
};

const deliveryAssignmentsMock = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
};

const ordersMock = {
  update: vi.fn(),
  findUnique: vi.fn(),
};

const storesMock = {
  findUnique: vi.fn(),
};

const notificationsMock = {
  create: vi.fn(),
};

const mockTx = {
  deliveries: deliveriesMock,
  deliveryAssignments: deliveryAssignmentsMock,
  orders: ordersMock,
  stores: storesMock,
  notifications: notificationsMock,
};

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    deliveries: deliveriesMock,
    deliveryAssignments: deliveryAssignmentsMock,
    orders: ordersMock,
    stores: storesMock,
    notifications: notificationsMock,
    $transaction: vi.fn((callback) => callback(mockTx)),
  },
}));

const TEST_JWT_SECRET = "test-secret-delivery-status";

let deliveryToken;
let adminToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  deliveryToken = jwt.sign(
    { id_user: 10, email: "delivery@test.com", role: "DELIVERY" },
    TEST_JWT_SECRET
  );

  adminToken = jwt.sign(
    { id_user: 99, email: "admin@test.com", role: "ADMIN" },
    TEST_JWT_SECRET
  );
});

const authCookie = (token) => `userToken=${token}`;

const mockDelivery = {
  id_delivery: 1,
  fk_user: 10,
  delivery_status: "ACTIVE",
  vehicle_type: "CAR",
  status: true,
};

describe("PATCH /api/deliveries/:id/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    deliveryAssignmentsMock.findMany.mockResolvedValue([]);
    storesMock.findUnique.mockResolvedValue({ fk_user: 1 });
    notificationsMock.create.mockResolvedValue({
      id_notification: 1,
    });
  });

  it("retorna 400 cuando delivery_status no se envía", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(
      /delivery_status es requerido/i
    );
  });

  it("retorna 400 cuando delivery_status es inválido", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({ delivery_status: "PAUSED" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(
      /ACTIVE o INACTIVE/i
    );
  });

  it("retorna 403 cuando el rol no es DELIVERY", async () => {
    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(adminToken))
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permisos/i);
  });

  it("retorna 400 cuando el id no es numérico", async () => {
    const res = await request(app)
      .patch("/api/deliveries/abc/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ID inválido/i);
  });

  it("retorna 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(
      /delivery no encontrado/i
    );
  });

  it("retorna 403 cuando intenta actualizar otro delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValue({
      ...mockDelivery,
      fk_user: 99,
    });

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({ delivery_status: "INACTIVE" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(
      /actualizar este delivery/i
    );
  });

  it("retorna 200 y actualiza el estado a ACTIVE", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(
      mockDelivery
    );

    deliveriesMock.update.mockResolvedValue({
      ...mockDelivery,
      delivery_status: "ACTIVE",
      updated_at: new Date("2026-05-04T00:00:00.000Z"),
    });

    const res = await request(app)
      .patch("/api/deliveries/1/status")
      .set("Cookie", authCookie(deliveryToken))
      .send({ delivery_status: "ACTIVE" });

    expect(res.status).toBe(200);

    expect(res.body).toMatchObject({
      message:
        "Estado del delivery actualizado exitosamente",
      data: {
        id_delivery: 1,
        fk_user: 10,
        delivery_status: "ACTIVE",
        status: true,
      },
    });

    expect(deliveriesMock.update).toHaveBeenCalledWith({
      where: { id_delivery: 1 },
      data: { delivery_status: "ACTIVE" },
    });
  });
});