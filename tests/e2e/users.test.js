import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    addresses: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import bcrypt from "bcrypt";

const TEST_JWT_SECRET = "test-secret-users";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

// Helper para generar tokens de prueba
const makeCustomerToken = (id = 1) =>
  jwt.sign({ id_user: id, email: "user@test.com", role: "CUSTOMER" }, TEST_JWT_SECRET);

const mockCreatedUser = {
  id_user: 1,
  name: "Nuevo Usuario",
  email: "nuevo@test.com",
  phone: null,
  role: "CUSTOMER",
  status: true,
  created_at: "2026-01-01T00:00:00.000Z",
};

const mockUserForAuth = {
  id_user: 1,
  role: "CUSTOMER",
  status: true,
};

const mockUpdatedUser = {
  id_user: 1,
  name: "Nombre Actualizado",
  email: "nuevo@test.com",
  phone: null,
  role: "CUSTOMER",
  status: true,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  addresses: [],
};

// ─── POST /api/users/register ─────────────────────────────────────────────────

describe("POST /api/users/register", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app).post("/api/users/register").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/name.*email.*password/i);
  });

  it("devuelve 400 cuando falta el password", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test", email: "test@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("devuelve 400 cuando el email tiene formato inválido", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test", email: "no-es-email", password: "123456" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/email/i);
  });

  it("devuelve 409 cuando el email ya está registrado", async () => {
    prisma.users.findUnique.mockResolvedValue({ id_user: 99, email: "existente@test.com" });

    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Test", email: "existente@test.com", password: "123456" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/ya se encuentra registrado/i);
  });

  it("devuelve 201 con el usuario creado cuando los datos son válidos", async () => {
    prisma.users.findUnique.mockResolvedValue(null); // email no existe
    bcrypt.hash.mockResolvedValue("$2b$10$hashedpassword");
    prisma.users.create.mockResolvedValue(mockCreatedUser);

    const res = await request(app)
      .post("/api/users/register")
      .send({ name: "Nuevo Usuario", email: "nuevo@test.com", password: "123456" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      name: "Nuevo Usuario",
      email: "nuevo@test.com",
      role: "CUSTOMER",
    });
    // La contraseña nunca debe enviarse en la respuesta
    expect(res.body.data).not.toHaveProperty("password_hash");
  });
});

// ─── PUT /api/users/:id_user ──────────────────────────────────────────────────

describe("PUT /api/users/:id_user", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de autenticación", async () => {
    const res = await request(app)
      .put("/api/users/1")
      .send({ name: "Nuevo Nombre" });

    expect(res.status).toBe(401);
  });

  it("devuelve 403 cuando el usuario intenta editar otro perfil", async () => {
    const tokenUser2 = makeCustomerToken(2); // token del usuario 2
    prisma.users.findUnique.mockResolvedValue(null); // no se llega a buscar

    const res = await request(app)
      .put("/api/users/1") // editar usuario 1
      .set("Cookie", `userToken=${tokenUser2}`)
      .send({ name: "Nombre" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/no tiene permisos/i);
  });

  it("devuelve 400 cuando no se envía ningún campo actualizable", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUserForAuth);

    const res = await request(app)
      .put("/api/users/1")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/al menos uno/i);
  });

  it("devuelve 200 con el usuario actualizado", async () => {
    prisma.users.findUnique
      .mockResolvedValue(mockUserForAuth) // getAuthorizedCustomerService
      //.mockResolvedValue(null); // verificar email único
    prisma.users.update.mockResolvedValue(mockUpdatedUser);

    const res = await request(app)
      .put("/api/users/1")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ name: "Nombre Actualizado" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Nombre Actualizado");
  });
});

// ─── PUT /api/users/:id_user/password ────────────────────────────────────────

describe("PUT /api/users/:id_user/password", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de autenticación", async () => {
    const res = await request(app)
      .put("/api/users/1/password")
      .send({ currentPassword: "vieja", newPassword: "nueva123" });

    expect(res.status).toBe(401);
  });

  it("devuelve 400 cuando faltan currentPassword o newPassword", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUserForAuth);

    const res = await request(app)
      .put("/api/users/1/password")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ currentPassword: "vieja" }); // falta newPassword

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/currentPassword.*newPassword/i);
  });

  it("devuelve 400 cuando la contraseña actual no coincide", async () => {
    prisma.users.findUnique.mockImplementation(async ({ select }) => {
      if (select?.id_user && select?.status) return mockUserForAuth;
      if (select?.password_hash) return { password_hash: "$2b$10$hash" };
      return null;
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .put("/api/users/1/password")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ currentPassword: "incorrecta", newPassword: "nueva123" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/contraseña actual.*incorrecta/i);
  });

  it("devuelve 200 cuando la contraseña se actualiza correctamente", async () => {
    prisma.users.findUnique.mockImplementation(async ({ select }) => {
      if (select?.id_user && select?.status) return mockUserForAuth;
      if (select?.password_hash) return { password_hash: "$2b$10$hash" };
      return null;
    });
    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue("$2b$10$newhash");
    prisma.users.update.mockResolvedValue(mockUpdatedUser);

    const res = await request(app)
      .put("/api/users/1/password")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ currentPassword: "correcta", newPassword: "nueva123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/actualizada/i);
  });
});

// ─── PUT /api/users/:id_user/addresses/:id_address ───────────────────────────

describe("PUT /api/users/:id_user/addresses/:id_address", () => {
  beforeEach(() => vi.resetAllMocks());

  it("devuelve 401 cuando no hay cookie de autenticación", async () => {
    const res = await request(app)
      .put("/api/users/1/addresses/1")
      .send({ address: "Nueva calle 123" });

    expect(res.status).toBe(401);
  });

  it("devuelve 404 cuando la dirección no existe o no pertenece al usuario", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUserForAuth);
    prisma.addresses.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .put("/api/users/1/addresses/999")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ address: "Nueva calle 123" });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/no encontrada/i);
  });

  it("devuelve 400 cuando no se envía ningún campo actualizable", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUserForAuth);
    prisma.addresses.findFirst.mockResolvedValue({ id_address: 1 });

    const res = await request(app)
      .put("/api/users/1/addresses/1")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/al menos uno/i);
  });

  it("devuelve 200 con la dirección actualizada", async () => {
    prisma.users.findUnique.mockResolvedValue(mockUserForAuth);
    prisma.addresses.updateMany.mockResolvedValue({ count: 1 });
    prisma.addresses.findUnique.mockResolvedValue({
      id_address: 1,
      fk_user: 1,
      fk_store: null,
      address: "Nueva calle 123",
      city: "Luque",
      region: "Central",
      postal_code: null,
      latitude: null,
      longitude: null,
      status: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    const res = await request(app)
      .put("/api/users/1/addresses/1")
      .set("Cookie", `userToken=${makeCustomerToken(1)}`)
      .send({ address: "Nueva calle 123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("city", "Luque");
  });
});
