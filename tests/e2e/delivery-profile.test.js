import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => {
  const mockPrisma = {
    deliveries: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    users: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback({ users: { update: vi.fn() }, deliveries: { update: vi.fn() } })),
  };
  return { prisma: mockPrisma };
});

vi.mock("../../src/modules/images/services/user-image.service.js", () => ({
  upsertUserImage: vi.fn().mockResolvedValue("https://storage.example.com/avatar.jpg"),
}));

const TEST_JWT_SECRET = "test-secret-delivery-profile";
let deliveryToken;
let sellerToken;
let adminToken;

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  deliveryToken = jwt.sign({ id_user: 10, email: "delivery@test.com", role: "DELIVERY" }, TEST_JWT_SECRET);
  sellerToken = jwt.sign({ id_user: 1, email: "seller@test.com", role: "SELLER" }, TEST_JWT_SECRET);
  adminToken = jwt.sign({ id_user: 99, email: "admin@test.com", role: "ADMIN" }, TEST_JWT_SECRET);
});

const authCookie = (token) => `userToken=${token}`;

const mockUser = {
  id_user: 10,
  name: "Juan Delivery",
  email: "delivery@test.com",
  phone: "1234567890",
  avatar_url: null,
  role: "DELIVERY",
};

const mockDelivery = {
  id_delivery: 1,
  fk_user: 10,
  fk_store: 1,
  delivery_status: "ACTIVE",
  vehicle_type: "MOTORCYCLE",
  status: true,
  user: mockUser,
};

const mockUpdatedDeliveryBase = (overrides = {}) => ({
  id_delivery: 1,
  fk_user: 10,
  fk_store: 1,
  delivery_status: "ACTIVE",
  vehicle_type: overrides.vehicle_type || "MOTORCYCLE",
  status: true,
  user: {
    name: overrides.name ?? mockUser.name,
    phone: overrides.phone ?? mockUser.phone,
    avatar_url: overrides.avatar_url ?? mockUser.avatar_url,
    email: mockUser.email,
  },
});

describe("PUT /api/deliveries/:id — E2E profile", () => {
  beforeEach(() => vi.resetAllMocks());

  it("Actualiza solo name y retorna 200", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery) // primera verificación
      .mockResolvedValueOnce(mockUpdatedDeliveryBase({ name: "Nuevo Nombre" })); // respuesta final

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ name: "Nuevo Nombre" });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("name", "Nuevo Nombre");
  });

  it("Actualiza solo phone y retorna 200", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase({ phone: "0987654321" }));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ phone: "0987654321" });

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty("phone", "0987654321");
  });

  it("Actualiza solo vehicleType y retorna 200", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase({ vehicle_type: "BICYCLE" }));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ vehicleType: "BICYCLE" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("vehicle_type", "BICYCLE");
  });

  it("Sube avatar con multipart y retorna 200", async () => {
    // Mock upsertUserImage ya resuelve con URL en vi.mock
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase({ avatar_url: "https://storage.example.com/avatar.jpg" }));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .field("name", "Con Imagen")
      .attach("avatarUrl", Buffer.from("fake-image-data"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    const { upsertUserImage } = await import("../../src/modules/images/services/user-image.service.js");

    expect(res.status).toBe(200);
    expect(upsertUserImage).toHaveBeenCalled();
    expect(res.body.user).toHaveProperty("avatar_url", "https://storage.example.com/avatar.jpg");
  });

  it("Actualiza multiples campos en transacción y retorna 200", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase({ name: "Juan Nuevo", phone: "0987654321", vehicle_type: "BICYCLE" }));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ name: "Juan Nuevo", phone: "0987654321", vehicleType: "BICYCLE" });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: "Juan Nuevo", phone: "0987654321" });
    expect(res.body).toHaveProperty("vehicle_type", "BICYCLE");
  });

  it("Body vacío no ejecuta updates y retorna 200", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase());

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({});

    expect(res.status).toBe(200);
    // $transaction should not call updates for empty body; users.update and deliveries.update remain mocked but may not be called
    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.deliveries.update).not.toHaveBeenCalled();
  });

  it("Retorna 403 cuando rol no es DELIVERY", async () => {
    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(sellerToken))
      .send({ name: "Intento" });

    expect(res.status).toBe(403);
  });

  it("Retorna 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/deliveries/999")
      .set("Cookie", authCookie(deliveryToken))
      .send({ name: "NoExiste" });

    expect(res.status).toBe(404);
  });

  it("Retorna 403 cuando intenta actualizar delivery ajeno", async () => {
    prisma.deliveries.findUnique.mockResolvedValue({ ...mockDelivery, fk_user: 99 });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ name: "Intruso" });

    expect(res.status).toBe(403);
  });

  it("Retorna 400 cuando phone inválido (<10 dígitos)", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ phone: "123" });

    expect(res.status).toBe(400);
  });

  it("Retorna 400 cuando vehicleType no es válido", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(mockDelivery);

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ vehicleType: "TRUCK" });

    expect(res.status).toBe(400);
  });

  it("Retorna 413 cuando upsertUserImage indica imagen demasiado grande", async () => {
    // simular que upsertUserImage lanza error con statusCode 413
    const { upsertUserImage } = await import("../../src/modules/images/services/user-image.service.js");
    upsertUserImage.mockRejectedValueOnce({ statusCode: 413, message: "Imagen demasiado grande" });

    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase());

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .field("name", "Con Imagen Grande")
      .attach("avatarUrl", Buffer.from("fake-image-data"), {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(413);
  });

  it("Retorna 500 cuando upsertUserImage falla inesperadamente", async () => {
    const { upsertUserImage } = await import("../../src/modules/images/services/user-image.service.js");
    upsertUserImage.mockRejectedValueOnce(new Error("Supabase error"));

    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDeliveryBase());

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .field("name", "Con Error Imagen")
      .attach("avatarUrl", Buffer.from("fake-image-data"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(500);
  });

  it("Retorna 500 cuando prisma falla inesperadamente", async () => {
    prisma.deliveries.findUnique.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie(deliveryToken))
      .send({ name: "Nombre" });

    expect(res.status).toBe(500);
  });
});
