import { vi, describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    users: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/utils/password.utils.js", () => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

import { verifyPassword } from "../../src/lib/utils/password.utils.js";

const TEST_JWT_SECRET = "test-secret-session";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

const mockUser = {
  id_user: 1,
  name: "Usuario Test",
  email: "usuario@test.com",
  password_hash: "$2b$10$hashedpassword",
  role: "CUSTOMER",
  status: true,
  phone: "0981000000",
  store: null,
};

// ─── POST /api/session (login) ────────────────────────────────────────────────

describe("POST /api/session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan email y password", async () => {
    const res = await request(app).post("/api/session").send({});

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/email.*contraseña/i);
  });

  it("devuelve 400 cuando falta solo el password", async () => {
    const res = await request(app)
      .post("/api/session")
      .send({ email: "usuario@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("devuelve 401 cuando el usuario no existe", async () => {
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/session")
      .send({ email: "noexiste@test.com", password: "123456" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/credenciales inválidas/i);
  });

  it("devuelve 401 cuando la contraseña no coincide", async () => {
    prisma.users.findFirst.mockResolvedValue(mockUser);
    verifyPassword.mockResolvedValue(false);

    const res = await request(app)
      .post("/api/session")
      .send({ email: "usuario@test.com", password: "incorrecta" });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/credenciales inválidas/i);
  });

  it("devuelve 200 con datos del usuario en login exitoso", async () => {
    prisma.users.findFirst.mockResolvedValue(mockUser);
    verifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/session")
      .send({ email: "usuario@test.com", password: "correcta" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      id_user: 1,
      email: "usuario@test.com",
      role: "CUSTOMER",
    });
    // La cookie userToken debe estar presente en la respuesta
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toMatch(/userToken=/);
  });

  it("acepta email con mayúsculas y busca en minúsculas", async () => {
    prisma.users.findFirst.mockResolvedValue(mockUser);
    verifyPassword.mockResolvedValue(true);

    const res = await request(app)
      .post("/api/session")
      .send({ email: "Usuario@Test.com", password: "correcta" });

    expect(res.status).toBe(200);
    expect(prisma.users.findFirst).toHaveBeenCalledWith({
      where: {
        email: "usuario@test.com",
        status: true,
      },
    });
  });
});

// ─── DELETE /api/session (logout) ────────────────────────────────────────────

describe("DELETE /api/session", () => {
  it("devuelve 200 y limpia la cookie de sesión", async () => {
    const res = await request(app).delete("/api/session");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/sesión cerrada/i);
    // La cookie debe estar siendo limpiada (valor vacío o expirada)
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      expect(cookies[0]).toMatch(/userToken=/);
    }
  });
});

// ─── GET /api/session/user-session ───────────────────────────────────────────

describe("GET /api/session/user-session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 401 cuando no hay cookie de sesión", async () => {
    const res = await request(app).get("/api/session/user-session");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.message).toMatch(/token|autenticado/i);
  });

  it("devuelve 401 cuando el token es inválido o está expirado", async () => {
    const res = await request(app)
      .get("/api/session/user-session")
      .set("Cookie", "userToken=token-invalido");

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it("devuelve 200 con datos del usuario cuando el token es válido", async () => {
    const token = jwt.sign(
      { id_user: 1, email: "usuario@test.com", role: "CUSTOMER" },
      TEST_JWT_SECRET
    );
    prisma.users.findFirst.mockResolvedValue({
      ...mockUser,
      store: null,
      delivery: null,
    });

    const res = await request(app)
      .get("/api/session/user-session")
      .set("Cookie", `userToken=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toMatchObject({
      id_user: 1,
      email: "usuario@test.com",
      role: "CUSTOMER",
    });
  });

  it("devuelve 401 cuando el usuario del token ya no existe en la BD", async () => {
    const token = jwt.sign(
      { id_user: 999, email: "borrado@test.com", role: "CUSTOMER" },
      TEST_JWT_SECRET
    );
    prisma.users.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/session/user-session")
      .set("Cookie", `userToken=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });
});