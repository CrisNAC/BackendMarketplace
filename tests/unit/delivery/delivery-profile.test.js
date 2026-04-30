//delivery-profile.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";

// Mock de prisma
vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    deliveries: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock de JWT: usuario autenticado con rol DELIVERY y id_user = 10
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

// Mock del servicio de imagen para evitar llamadas reales a Supabase
vi.mock("../../../src/modules/images/services/user-image.service.js", () => ({
  upsertUserImage: vi.fn().mockResolvedValue("https://storage.example.com/avatar.jpg"),
}));

const authCookie = "userToken=mock-token";

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
  vehicle_type: "MOTO",
  status: true,
  user: mockUser,
};

const mockUpdatedDelivery = {
  id_delivery: 1,
  fk_user: 10,
  fk_store: 1,
  delivery_status: "ACTIVE",
  vehicle_type: "BICICLETA",
  status: true,
  user: {
    name: "Juan Actualizado",
    phone: "0987654321",
    avatar_url: null,
    email: "delivery@test.com",
  },
};

describe("PUT /api/deliveries/:id — Actualizar perfil de delivery", () => {
  beforeEach(() => vi.clearAllMocks());

  // --- Validación de parámetros ---

  it("devuelve 400 cuando el ID no es numérico", async () => {
    const res = await request(app)
      .put("/api/deliveries/abc")
      .set("Cookie", authCookie)
      .send({ name: "Nombre" });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/ID inválido/i);
  });

  // --- Autenticación y autorización ---

  it("devuelve 401 cuando no hay autenticación", async () => {
    const res = await request(app)
      .put("/api/deliveries/1")
      .send({ name: "Nombre" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el rol no es DELIVERY", async () => {
    const jwt = await import("jsonwebtoken");
    jwt.default.verify.mockImplementationOnce((token, secret, callback) => {
      callback(null, { id_user: 10, email: "customer@test.com", role: "CUSTOMER" });
    });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Nombre" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permisos/i);
  });

  // --- Delivery no encontrado ---

  it("devuelve 404 cuando el delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .put("/api/deliveries/999")
      .set("Cookie", authCookie)
      .send({ name: "Nombre" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  // --- Propiedad (403 si no es dueño) ---

  it("devuelve 403 cuando intenta actualizar perfil de otro delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      ...mockDelivery,
      fk_user: 99, // fk_user diferente al autenticado (10)
    });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Nombre Intruso" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/no tienes permiso/i);
  });

  // --- Actualización exitosa: solo nombre ---

  it("devuelve 200 al actualizar solo el nombre", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery) // primera llamada: verificación
      .mockResolvedValueOnce({ ...mockUpdatedDelivery, user: { ...mockUpdatedDelivery.user, name: "Nuevo Nombre" } }); // segunda llamada: respuesta
    prisma.users.update.mockResolvedValue({});

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Nuevo Nombre" });

    expect(res.status).toBe(200);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id_user: 10 },
      data: { name: "Nuevo Nombre" },
    });
  });

  // --- Actualización exitosa: solo teléfono ---

  it("devuelve 200 al actualizar solo el teléfono", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce({ ...mockUpdatedDelivery, user: { ...mockUpdatedDelivery.user, phone: "0987654321" } });
    prisma.users.update.mockResolvedValue({});

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ phone: "0987654321" });

    expect(res.status).toBe(200);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id_user: 10 },
      data: { phone: "0987654321" },
    });
  });

  // --- Actualización exitosa: vehicleType ---

  it("devuelve 200 al actualizar vehicleType", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce({ ...mockUpdatedDelivery, vehicle_type: "BICICLETA" });
    prisma.deliveries.update.mockResolvedValue({});

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ vehicleType: "BICICLETA" });

    expect(res.status).toBe(200);
    expect(prisma.deliveries.update).toHaveBeenCalledWith({
      where: { id_delivery: 1 },
      data: { vehicle_type: "BICICLETA" },
    });
  });

  // --- Actualización exitosa: múltiples campos ---

  it("devuelve 200 al actualizar nombre, teléfono y vehicleType juntos", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDelivery);
    prisma.users.update.mockResolvedValue({});
    prisma.deliveries.update.mockResolvedValue({});

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Juan Actualizado", phone: "0987654321", vehicleType: "BICICLETA" });

    expect(res.status).toBe(200);
    expect(prisma.users.update).toHaveBeenCalledWith({
      where: { id_user: 10 },
      data: { name: "Juan Actualizado", phone: "0987654321" },
    });
    expect(prisma.deliveries.update).toHaveBeenCalledWith({
      where: { id_delivery: 1 },
      data: { vehicle_type: "BICICLETA" },
    });
  });

  // --- Validación de campos ---

  it("devuelve 400 cuando el nombre es muy corto", async () => {
    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "A" });

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando el teléfono tiene formato inválido", async () => {
    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ phone: "123" });

    expect(res.status).toBe(400);
  });

  it("devuelve 400 cuando vehicleType es un string vacío", async () => {
    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ vehicleType: "" });

    expect(res.status).toBe(400);
  });

  // --- Upload de imagen ---

  it("devuelve 200 al subir imagen con perfil", async () => {
    const { upsertUserImage } = await import("../../../src/modules/images/services/user-image.service.js");

    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce({
        ...mockUpdatedDelivery,
        user: { ...mockUpdatedDelivery.user, avatar_url: "https://storage.example.com/avatar.jpg" },
      });
    prisma.users.update.mockResolvedValue({});

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .field("name", "Con Imagen")
      .attach("avatarUrl", Buffer.from("fake-image-data"), {
        filename: "avatar.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(upsertUserImage).toHaveBeenCalled();
  });

  // --- Sin cambios (body vacío) ---

  it("devuelve 200 cuando se envía body vacío (sin cambios)", async () => {
    prisma.deliveries.findUnique
      .mockResolvedValueOnce(mockDelivery)
      .mockResolvedValueOnce(mockUpdatedDelivery);

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(200);
    // No se debe llamar a update de users ni deliveries
    expect(prisma.users.update).not.toHaveBeenCalled();
    expect(prisma.deliveries.update).not.toHaveBeenCalled();
  });

  // --- Error interno ---

  it("devuelve 500 cuando prisma falla inesperadamente", async () => {
    prisma.deliveries.findUnique.mockRejectedValue(new Error("Database error"));

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Nombre" });

    expect(res.status).toBe(500);
  });
});
