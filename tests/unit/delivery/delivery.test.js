//delivery.test.js
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
      update: vi.fn(),
    },
    deliveries: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    stores: {
      findUnique: vi.fn(),
    },
    deliveryAssignments: {
      count: vi.fn(),
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

const authCookie = "userToken=mock-token";

describe("POST /api/deliveries/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({ name: "Juan", email: "juan@test.com" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(400);
  });

  it("devuelve 400 cuando email tiene formato inválido", async () => {
    const res = await request(app)
      .post("/api/deliveries/register")
      .send({
        name: "Juan",
        email: "not-an-email",
        password: "123456",
        phone: "1234567890",
      });

    expect(res.status).toBe(400);
  });

  it("devuelve 409 cuando email ya está registrado", async () => {
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

  it("devuelve 201 y crea un nuevo delivery", async () => {
    prisma.users.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValueOnce("hashed-password");
    prisma.users.create.mockResolvedValue({
      id_user: 1,
      name: "Juan",
      email: "juan@test.com",
      phone: "1234567890",
      role: "DELIVERY",
      created_at: new Date(),
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
    expect(res.body.role).toBe("DELIVERY");
  });
});

describe("POST /api/deliveries/login", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan credenciales", async () => {
    const res = await request(app)
      .post("/api/deliveries/login")
      .send({ email: "juan@test.com" });

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/deliveries/login")
      .send({
        email: "noexiste@test.com",
        password: "123456",
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/usuario no encontrado/i);
  });

  it("devuelve 401 cuando contraseña es incorrecta", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      email: "juan@test.com",
      password_hash: "hashed-password",
      role: "DELIVERY",
      name: "Juan",
    });
    bcrypt.hash.mockResolvedValueOnce("hashed");
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/deliveries/login")
      .send({
        email: "juan@test.com",
        password: "wrongpassword",
      });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/contraseña incorrecta/i);
  });

  it("devuelve 200 y token cuando credenciales son correctas", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      name: "Juan",
      email: "juan@test.com",
      password_hash: "hashed-password",
      role: "DELIVERY",
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/api/deliveries/login")
      .send({
        email: "juan@test.com",
        password: "123456",
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.id_user).toBe(1);
  });
});

describe("POST /api/deliveries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("devuelve 400 cuando faltan campos obligatorios", async () => {
    const res = await request(app)
      .post("/api/deliveries")
      .set("Cookie", authCookie)
      .send({ fk_user: 1 });

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando usuario no existe", async () => {
    prisma.users.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/deliveries")
      .set("Cookie", authCookie)
      .send({
        fk_user: 999,
        fk_store: 1,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/usuario no encontrado/i);
  });

  it("devuelve 400 cuando usuario no es DELIVERY", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "CUSTOMER",
    });

    const res = await request(app)
      .post("/api/deliveries")
      .set("Cookie", authCookie)
      .send({
        fk_user: 1,
        fk_store: 1,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/debe tener rol DELIVERY/i);
  });

  it("devuelve 404 cuando tienda no existe", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "DELIVERY",
    });
    prisma.stores.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/deliveries")
      .set("Cookie", authCookie)
      .send({
        fk_user: 1,
        fk_store: 999,
      });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/tienda no encontrada/i);
  });

  it("devuelve 201 y crea delivery exitosamente", async () => {
    prisma.users.findUnique.mockResolvedValue({
      id_user: 1,
      role: "DELIVERY",
    });
    prisma.stores.findUnique.mockResolvedValue({
      id_store: 1,
      name: "Mi Tienda",
    });
    prisma.deliveries.create.mockResolvedValue({
      id_delivery: 1,
      fk_user: 1,
      fk_store: 1,
      delivery_status: "ACTIVE",
      status: true,
      created_at: new Date(),
    });

    const res = await request(app)
      .post("/api/deliveries")
      .set("Cookie", authCookie)
      .send({
        fk_user: 1,
        fk_store: 1,
        delivery_status: "ACTIVE",
      });

    expect(res.status).toBe(201);
    expect(res.body.delivery_status).toBe("ACTIVE");
  });
});

describe("PUT /api/deliveries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 400 cuando no hay campos para actualizar", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(400);
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Juan Actualizado" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 404 cuando usuario no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });

    prisma.users.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Juan Actualizado" });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/usuario no encontrado/i);
  });

  it("devuelve 403 cuando usuario no es DELIVERY", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });

    prisma.users.findUnique.mockResolvedValueOnce({
      id_user: 10,
      role: "CUSTOMER",
    });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ name: "Juan Actualizado" });

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/no es un delivery/i);
  });

  it("devuelve 409 cuando email ya está en uso", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });

    prisma.users.findUnique
      .mockResolvedValueOnce({
        id_user: 10,
        role: "DELIVERY",
      })
      .mockResolvedValueOnce({
        id_user: 99,
        email: "otro@test.com",
      });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({ email: "otro@test.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/email ya registrado/i);
  });

  it("devuelve 200 y actualiza datos correctamente", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });

    prisma.users.findUnique
      .mockResolvedValueOnce({
        id_user: 10,
        role: "DELIVERY",
      })
      .mockResolvedValueOnce(null);

    prisma.users.update.mockResolvedValueOnce({
      id_user: 10,
      name: "Juan Actualizado",
      email: "juan@test.com",
      phone: "9876543210",
      avatar_url: "https://example.com/avatar.jpg",
      role: "DELIVERY",
    });

    const res = await request(app)
      .put("/api/deliveries/1")
      .set("Cookie", authCookie)
      .send({
        name: "Juan Actualizado",
        phone: "9876543210",
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Juan Actualizado");
  });
});

describe("DELETE /api/deliveries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .delete("/api/deliveries/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 409 cuando hay asignaciones PENDING activas", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });
    prisma.deliveryAssignments.count.mockResolvedValueOnce(1);

    const res = await request(app)
      .delete("/api/deliveries/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/hay asignaciones pendientes/i);
  });

  it("devuelve 200 y elimina delivery", async () => {
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
    });
    prisma.deliveryAssignments.count.mockResolvedValueOnce(0);
    prisma.deliveries.update.mockResolvedValueOnce({
      id_delivery: 1,
      status: false,
    });

    const res = await request(app)
      .delete("/api/deliveries/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/eliminado/i);
  });
});

describe("GET /api/deliveries/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 404 cuando delivery no existe", async () => {
    // Mock específico: devuelve null para "no existe"
    prisma.deliveries.findUnique.mockResolvedValueOnce(null);

    const res = await request(app)
      .get("/api/deliveries/999")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/delivery no encontrado/i);
  });

  it("devuelve 200 y datos del delivery", async () => {
    // Mock específico: devuelve el objeto delivery
    prisma.deliveries.findUnique.mockResolvedValueOnce({
      id_delivery: 1,
      fk_user: 10,
      delivery_status: "ACTIVE",
      user: { id_user: 10, name: "Juan" },
      store: { id_store: 1, name: "Tienda" },
      delivery_assignments: [],
    });

    const res = await request(app)
      .get("/api/deliveries/1")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.id_delivery).toBe(1);
  });
});