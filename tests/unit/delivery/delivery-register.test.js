//delivery-register.test.js
import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../src/app.js";
import { prisma } from "../../../src/lib/prisma.js";
import bcrypt from "bcrypt";

vi.mock("../../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock("../../../src/config/jwt.config.js", () => ({
  default: vi.fn((req, res, next) => {
    req.user = { id_user: 10, email: "delivery@test.com", role: "DELIVERY" };
    next();
  }),
  generateToken: vi.fn(() => "mock-token-12345"),
}));

describe("POST /api/deliveries/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({ name: "Juan", email: "juan@test.com" }); // Falta password y phone

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 400 cuando email tiene formato inválido", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "no-es-un-email",
        password: "123456",
        phone: "1234567890",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 400 cuando el nombre tiene menos de 2 caracteres", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "J",
        email: "juan@test.com",
        password: "123456",
        phone: "1234567890",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 400 cuando la contraseña tiene menos de 6 caracteres", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "juan@test.com",
        password: "123",
        phone: "1234567890",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 400 cuando el teléfono tiene menos de 10 dígitos", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "juan@test.com",
        password: "123456",
        phone: "123",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 409 cuando el email ya está registrado", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      email: "juan@test.com",
    });

    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "juan@test.com",
        password: "123456",
        phone: "1234567890",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/email ya registrado/i);
  });

  it("devuelve 201 y crea el delivery sin exponer password_hash", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValueOnce("hashed-password");
    prisma.users.create.mockResolvedValue({
      id_user: 1,
      name: "Juan",
      email: "juan@test.com",
      phone: "1234567890",
      role: "DELIVERY",
    });

    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "juan@test.com",
        password: "123456",
        phone: "1234567890",
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Juan");
    expect(res.body.email).toBe("juan@test.com");
    expect(res.body.role).toBe("DELIVERY");
    // No debe exponer el hash de la contraseña
    expect(res.body.password_hash).toBeUndefined();
  });
});